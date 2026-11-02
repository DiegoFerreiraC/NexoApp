export default class CommandBus {
  static async execute(command) {
    if (!command || typeof command.execute !== "function") {
      throw new Error("Comando inválido.");
    }

    return command.execute();
  }
}