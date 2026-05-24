"use client";

import { Button, Card, Input, Slider, message } from "antd";
import {
  ArrowBigDown,
  ArrowBigLeft,
  ArrowBigRight,
  ArrowBigUp,
  CloudDownload,
  CloudUpload,
} from "lucide-react";

import { useRef, useState } from "react";

export default function EidCard() {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [text, setText] = useState("");
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const move = (dx: number, dy: number) => {
    setPosition((prev) => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setUserPhoto(url);

    message.success("Photo uploaded!");
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleDownload = async () => {
    try {
      setIsProcessing(true);
      setProgress(0);

      const response = await fetch("/images/Eid-card.gif");
      const buffer = await response.arrayBuffer();

      const gifuct = await import("gifuct-js");
      const parsedGif = gifuct.parseGIF(buffer);
      const frames = gifuct.decompressFrames(parsedGif, true);

      const width = parsedGif.lsd.width;
      const height = parsedGif.lsd.height;

      const GIF = (await import("gif.js")).default;

      const gif = new GIF({
        workers: Math.max(2, navigator.hardwareConcurrency || 4),
        quality: 5,
        width,
        height,
        workerScript: "/gif.worker.js",
        dither: false,
      });

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const offCanvas = document.createElement("canvas");
      offCanvas.width = width;
      offCanvas.height = height;

      const offCtx = offCanvas.getContext("2d");
      if (!offCtx) return;

      const uploadedImage = userPhoto
        ? await new Promise<HTMLImageElement>((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = userPhoto;
          })
        : null;

      const baseSize = width * 0.28;
      const radius = 20;

      const centerX = width * 0.5;
      const centerY = height * 0.63875;

      const xBase = centerX - baseSize / 2;
      const yBase = centerY - baseSize / 2;

      for (let i = 0; i < frames.length; i += 1) {
        const f = frames[i];

        const imageData = new ImageData(
          new Uint8ClampedArray(f.patch),
          f.dims.width,
          f.dims.height,
        );

        const patchCanvas = document.createElement("canvas");
        patchCanvas.width = f.dims.width;
        patchCanvas.height = f.dims.height;

        const pctx = patchCanvas.getContext("2d");
        if (!pctx) continue;

        pctx.putImageData(imageData, 0, 0);

        offCtx.drawImage(patchCanvas, f.dims.left, f.dims.top);

        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(offCanvas, 0, 0, width, height);

        if (uploadedImage) {
          const imgRatio = uploadedImage.width / uploadedImage.height;

          const drawWidth = baseSize * zoom;
          const drawHeight = drawWidth / imgRatio;

          const positionX = (position.x * drawWidth) / 103;
          const positionY = (position.y * drawWidth) / 103;

          const sizedX = centerX - drawWidth / 2 + positionX;
          const sizedY = centerY - drawHeight / 2 + positionY;

          ctx.save();
          ctx.beginPath();
          ctx.roundRect(
            xBase - 40,
            yBase - 40,
            baseSize + 40,
            baseSize + 40,
            radius,
          );
          ctx.clip();

          ctx.drawImage(uploadedImage, sizedX, sizedY, drawWidth, drawHeight);

          ctx.restore();
        }

        if (text) {
          ctx.font = `${width * 0.04}px Arial`;
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(text, width / 2, height * 0.82);
        }

        gif.addFrame(ctx, {
          copy: true,
          delay: f.delay || 80,
        });

        setProgress(Math.round((i / frames.length) * 100));
      }

      gif.on("progress", (p: number) => {
        setProgress(Math.round(p * 100));
      });

      gif.on("finished", (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = `eid-${text || "card"}.gif`;
        a.click();

        URL.revokeObjectURL(url);

        setIsProcessing(false);
        setProgress(0);
        message.success("Downloaded!");
      });

      gif.render();
    } catch (err) {
      console.error(err);
      message.error("Error!");
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center p-4">
      <div className="w-full min-w-[360px] max-w-[360px]">
        <Card className="mb-4 overflow-hidden">
          <div className="relative">
            {userPhoto && (
              <div
                className="absolute left-1/2 top-[64%] z-10"
                style={{
                  transform: `
                    translate(-50%, -50%)
                    translate(${position.x}px, ${position.y}px)
                    scale(${zoom})
                  `,
                }}
              >
                <img
                  src={userPhoto}
                  alt=""
                  className="w-[103px] h-auto object-cover"
                />
              </div>
            )}

            <img
              src="/images/Eid-card.gif"
              className="w-full block relative z-20"
              alt=""
            />

            {text && (
              <div
                className="absolute left-1/2 bottom-[16%] z-30"
                style={{ transform: "translateX(-50%)" }}
              >
                <h1
                  className="text-white whitespace-nowrap"
                  style={{
                    fontSize:
                      text.length > 24
                        ? `${Math.max(10, 18 * (24 / text.length))}px`
                        : "18px",
                  }}
                >
                  {text}
                </h1>
              </div>
            )}
          </div>
        </Card>

        <div className="justify-center flex mt-4">
          <Card className="w-[350px]">
            <div className="mb-3">
              <label className="text-sm font-medium text-gray-700 ">
                Zoom: {Math.round(zoom * 100)}%
              </label>
              <Slider
                min={0.5}
                max={2}
                step={0.05}
                value={zoom}
                onChange={setZoom}
                className="!ml-0"
              />
            </div>

            <div className="mb-2">
              <label className="text-sm font-medium text-gray-700">
                Move Photo
              </label>
              <div className="flex gap-2 mb-3 mt-2 ">
                <Button
                  icon={<ArrowBigUp size={16} />}
                  onClick={() => move(0, -8)}
                />
                <Button
                  icon={<ArrowBigDown size={16} />}
                  onClick={() => move(0, 8)}
                />
                <Button
                  icon={<ArrowBigLeft size={16} />}
                  onClick={() => move(-8, 0)}
                />
                <Button
                  icon={<ArrowBigRight size={16} />}
                  onClick={() => move(8, 0)}
                />
              </div>
            </div>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your name..."
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handlePhotoUpload}
            />

            <div className="flex gap-2 mt-4">
              <Button
                block
                icon={<CloudUpload size={16} />}
                onClick={openFileDialog}
              >
                Upload Photo
              </Button>

              <Button
                block
                type="primary"
                loading={isProcessing}
                icon={<CloudDownload size={16} />}
                onClick={handleDownload}
                style={{ backgroundColor: "#22c55e" }}
              >
                Download GIF
              </Button>
            </div>
            {isProcessing && (
              <div className="mt-3">
                <div className="text-sm mb-1 !text-gray-700 ">
                  Download: {progress}%
                </div>

                <div className="w-full h-2 bg-gray-200 rounded">
                  <div
                    className="h-2 bg-green-500 rounded transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
