
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const requiredEnv = [
  "R2_ENDPOINT",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
];

for (const name of requiredEnv) {
  if (!Deno.env.get(name)) {
    throw new Error(`Secret não configurado: ${name}`);
  }
}

const s3 = new S3Client({
  region: "auto",
  endpoint: Deno.env.get("R2_ENDPOINT")!,
  credentials: {
    accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
    secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
  },
});

const BUCKET = Deno.env.get("R2_BUCKET_NAME")!;
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

function response(data: unknown, status = 200) {
  return Response.json(data, { status });
}

function validUUID(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function extensionFor(type: string) {
  if (type === "application/pdf") return "pdf";
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  return null;
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    try {
      if (req.method !== "POST") {
        return response({ error: "Método não permitido." }, 405);
      }

      const userId = ctx.userClaims?.id;

      if (!userId) {
        return response({ error: "Usuário não autenticado." }, 401);
      }

      const contentType = req.headers.get("content-type") || "";

      let action: string | null = null;
      let form: FormData | null = null;
      let body: Record<string, unknown> | null = null;

      if (contentType.includes("multipart/form-data")) {
        form = await req.formData();
        const value = form.get("action");
        action = typeof value === "string" ? value : null;
      } else if (contentType.includes("application/json")) {
        body = await req.json();
        const value = body.action;
        action = typeof value === "string" ? value : null;
      } else {
        return response({ error: "Formato de requisição inválido." }, 400);
      }

      // UPLOAD: recebe o arquivo antes da criação da solicitação no banco.
      if (action === "upload") {
        
        const file = form?.get("file");
        const requestId = form?.get("requestId");

        if (!(file instanceof File) || typeof requestId !== "string" || !validUUID(requestId)) {
          return response({ error: "Dados do arquivo inválidos." }, 400);
        }

        const { data: profile, error: profileError } = await ctx.supabase
          .from("profiles")
          .select("id, employee_id, role")
          .eq("id", userId)
          .single();

        if (profileError || !profile || !profile.employee_id || profile.role !== "employee") {
          return response({ error: "Somente colaboradores podem enviar comprovantes." }, 403);
        }

        if (file.size <= 0 || file.size > MAX_SIZE) {
          return response({ error: "O arquivo deve ter no máximo 5 MB." }, 400);
        }

        const extension = extensionFor(file.type);

        if (!extension) {
          return response({ error: "Envie um arquivo PDF, JPG ou PNG." }, 400);
        }

        const key = `${userId}/${requestId}/comprovante.${extension}`;
        const bytes = new Uint8Array(await file.arrayBuffer());

        await s3.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: bytes,
          ContentLength: file.size,
          ContentType: file.type,
        }));

        return response({ attachmentPath: key });
      }

      // DELETE: remove o arquivo se o cadastro da solicitação falhar.
      if (action === "delete") {

        const { requestId, attachmentPath } = body || {};

        if (
          typeof requestId !== "string" ||
          !validUUID(requestId) ||
          typeof attachmentPath !== "string" ||
          !attachmentPath.startsWith(`${userId}/${requestId}/`)
        ) {
          return response({ error: "Caminho de arquivo inválido." }, 400);
        }

        await s3.send(new DeleteObjectCommand({
          Bucket: BUCKET,
          Key: attachmentPath,
        }));

        return response({ success: true });
      }

      // DOWNLOAD: a consulta respeita as políticas RLS existentes.
      if (action === "download") {
        
        const { requestId } = body || {};

        if (typeof requestId !== "string" || !validUUID(requestId)) {
          return response({ error: "Solicitação inválida." }, 400);
        }

        const { data: request, error: requestError } = await ctx.supabase
          .from("time_adjustment_requests")
          .select("id, attachment_path")
          .eq("id", requestId)
          .single();

        if (requestError || !request?.attachment_path) {
          return response({ error: "Comprovante não encontrado ou sem permissão." }, 404);
        }

        const downloadUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: BUCKET,
            Key: request.attachment_path,
            ResponseContentDisposition: "inline",
          }),
          { expiresIn: 300 },
        );

        return response({
          downloadUrl,
          expiresIn: 300,
        });
      }

      return response({ error: "Operação inválida." }, 400);

    } catch (error) {
      console.error("Erro em r2-attachments:", error);
      return response({
        error: "Não foi possível processar o comprovante.",
      }, 500);
    }
  }),
};
