import sharp from "sharp";
import fs from "fs";
import path from "path";

const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const ICONS_DIR = path.join(PUBLIC_DIR, "icons");

if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });

const tasks = [
  { src: "icon-source.svg", out: "icons/icon-192.png", size: 192 },
  { src: "icon-source.svg", out: "icons/icon-512.png", size: 512 },
  { src: "icon-maskable-source.svg", out: "icons/icon-maskable-192.png", size: 192 },
  { src: "icon-maskable-source.svg", out: "icons/icon-maskable-512.png", size: 512 },
  { src: "icon-source.svg", out: "apple-touch-icon.png", size: 180 },
  { src: "icon-source.svg", out: "favicon-32.png", size: 32 },
];

(async () => {
  for (const task of tasks) {
    const srcPath = path.join(PUBLIC_DIR, task.src);
    const outPath = path.join(PUBLIC_DIR, task.out);
    await sharp(srcPath).resize(task.size, task.size).png().toFile(outPath);
    console.log(`Generated ${task.out} (${task.size}x${task.size})`);
  }
})();
