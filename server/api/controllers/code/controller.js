import CodeService from "../../services/code.service";
import { v4 as uuidv4 } from "uuid";

export class Controller {
  async execute(req, res) {
    try {
      const { code, input } = req.body;
      const { lang } = req.query;
      const cid = uuidv4();
      const output = await CodeService.execute(code, input, lang, cid);

      if (output) {
        return res.json({
          status: 200,
          message: "Code Succesfully executed",
          output,
        });
      }
    } catch (error) {
      return res.json({
        status: error.status || "500",
        message: error.message || "Something Went Wrong",
      });
    }
  }
}
export default new Controller();
