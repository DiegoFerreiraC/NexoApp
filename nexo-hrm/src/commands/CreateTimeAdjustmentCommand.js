import Command from "./Command";

export default class CreateTimeAdjustmentCommand extends Command {
  constructor(supabase, requestData) {
    super();
    this.supabase = supabase;
    this.requestData = requestData;
  }

  async execute() {
    return this.supabase
      .from("time_adjustment_requests")
      .insert({
        ...this.requestData,
        status: "pending",
      });
  }
}