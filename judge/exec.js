import { exec } from "child_process";

export function execCmd(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { timeout: 5000 }, (err, stdout, stderr) => {
      if (err) {
        resolve({
          ok: false,
          message: stderr || err.message
        });
      } else {
        resolve({
          ok: true,
          output: stdout.trim()
        });
      }
    });
  });
}
