import Command from "./Command";

export default class ReviewTimeAdjustmentCommand extends Command {
  constructor(supabase, requestId, decision, reviewNote = null) {
    super();
    this.supabase = supabase;
    this.requestId = requestId;
    this.decision = decision;
    this.reviewNote = reviewNote;
  }

  async execute() {
    if (!["approved", "rejected"].includes(this.decision)) {
      throw new Error("Decisão inválida.");
    }

    return this.supabase.rpc("review_time_adjustment_request", {
      p_request_id: this.requestId,
      p_decision: this.decision,
      p_review_note: this.reviewNote,
    });
  }
}