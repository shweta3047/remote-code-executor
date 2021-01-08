import fs from "fs";
import { execFile, spawn, exec } from "child_process";
import path from "path";
import ValidationService from "./validation.service";
const ROOT_DIR = `${process.cwd()}`;
const IMAGE_NAME = `executor:2.0`;
const SOURCE_DIR = path.join(ROOT_DIR, "executor");
const TARGET_DIR = `/app/code`;
const MY_VOL = `${SOURCE_DIR}`;

console.log(SOURCE_DIR);
class CodeService {
  async execute(code, input, lang, cid) {
    try {
      //validating code
      const { isValid, message } = await ValidationService.execute(
        code,
        input,
        lang
      );
      if (!isValid) {
        throw {
          message,
        };
      }

      //writing code in file
      const { fileName, inputName } = await this.writeFile(
        code,
        input,
        lang,
        cid
      );

      //writing command
      const command = await this.writeCommand(lang, fileName, input);
      //executing code
      const output = await this.execChild(command);

      setTimeout(async () => {
        await this.deleteFiles(fileName, inputName, lang);
      }, 200);

      if (output) return output.toString();
    } catch (error) {
      throw { status: "404", message: error };
    }
  }

  async writeFile(code, input, lang, cid) {
    let fileName = `${cid}code`;
    let inputName = `${cid}input.txt`;
    switch (lang) {
      case "javascript": {
        fileName += ".js";
        break;
      }
      case "c++": {
        fileName += ".cpp";
        break;
      }
      case "python": {
        fileName += ".py";
        break;
      }
      default: {
        throw {
          message: "Invalid language",
        };
      }
    }

    fs.writeFile(`${SOURCE_DIR}/${fileName}`, code, (err) => {
      if (err) {
        throw {
          message: err,
        };
      }
    });
    fs.writeFile(`${SOURCE_DIR}/${inputName}`, input, (err) => {
      if (err) {
        throw {
          message: err,
        };
      }
    });

    return {
      fileName,
      inputName,
    };
  }

  async writeCommand(lang, fileName, inputName) {
    let command = "";
    switch (lang) {
      case "javascript": {
        command = `node "${SOURCE_DIR}/${fileName}"`;
        break;
      }
      case "c++": {
        command = `cd ${SOURCE_DIR} && g++ ${fileName} && a ${
          inputName ? `< ${inputName}` : null
        } && cd ..`;
        break;
      }
      case "python": {
        command = `cd ${SOURCE_DIR} && python ${fileName} && ${
          inputName ? `< ${inputName}` : null
        } && cd ..`;
        break;
      }
      default: {
        throw "Invalid language";
      }
    }

    const containerName = `${cid}container`;
    const runContainer = `docker run -it -d --name ${containerName} -v "${MY_VOL}":${TARGET_DIR} ${IMAGE_NAME}`;
    const runCode = `docker exec ${containerName} -sh -c ${command}`;

    return {
      runCode,
      runContainer,
    };
  }

  async execChild(command) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, { shell: true });
      child.stdout.on("data", (data) => {
        resolve(data);
      });
      child.stderr.on("data", (data) => {
        reject(data.toString());
      });
      child.on("error", (err) => {
        throw { status: "404", message: err };
      });

      child.on("exit", (code, signal) => {
        console.log("code: ", code);
        console.log("signal: ", signal);
      });
    });
  }

  async deleteFiles(fileName, inputName, lang) {
    fs.unlinkSync(`${SOURCE_DIR}/${fileName}`, (err) => {
      if (err) {
        throw err;
      }
    });
    if (inputName) {
      fs.unlinkSync(`${SOURCE_DIR}/${inputName}`, (err) => {
        if (err) {
          throw err;
        }
      });
    }
    if (lang == "c++") {
      fs.unlinkSync(`${SOURCE_DIR}/a.exe`, (err) => {
        if (err) {
          throw err;
        }
      });
    }
  }
}

export default new CodeService();
