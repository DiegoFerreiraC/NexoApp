import Command from "./Command";

export default class CreateVacationRequestCommand extends Command {
  constructor(supabase, requestData) {
    super();
    this.supabase = supabase;
    this.requestData = requestData;
  }

  async execute() {
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error("Sessão não encontrada.");

    return this.supabase
      .from("vacation_requests")
      .insert({
        ...this.requestData,
        status: "pending",
        requested_by: user.id,
      })
      .select()
      .single();
  }
}