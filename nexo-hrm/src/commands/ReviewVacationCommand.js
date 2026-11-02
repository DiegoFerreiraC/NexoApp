import Command from "./Command";

export default class ReviewVacationCommand extends Command {
  constructor(supabase, requestId, decision) {
    super();
    this.supabase = supabase;
    this.requestId = requestId;
    this.decision = decision;
  }

  async execute() {
    if (!["approved", "rejected"].includes(this.decision)) {
      throw new Error("Decisão inválida.");
    }

    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error("Sessão não encontrada.");

    return this.supabase
      .from("vacation_requests")
      .update({
        status: this.decision,
        approved_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", this.requestId)
      .eq("status", "pending")
      .select()
      .single();
  }
}