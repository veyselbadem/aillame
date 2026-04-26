import base64
import io
import json
import random
import sys


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError as exc:
        print(json.dumps({"error": f"Invalid JSON input: {exc}"}), file=sys.stderr)
        return 2

    model_id = payload.get("modelId") or "stabilityai/stable-diffusion-xl-base-1.0"
    prompt = payload.get("prompt") or ""
    negative_prompt = payload.get("negativePrompt") or ""
    width = int(payload.get("width") or 1024)
    height = int(payload.get("height") or 1024)
    steps = int(payload.get("steps") or 30)
    seed = payload.get("seed")
    if seed is None:
        seed = random.randint(0, 2**31 - 1)
    seed = int(seed)

    try:
        import torch
        from diffusers import StableDiffusionXLPipeline
    except Exception as exc:
        print(
            json.dumps(
                {
                    "error": "Python dependencies missing: install torch, diffusers, transformers, accelerate, safetensors, and pillow.",
                    "details": str(exc),
                }
            ),
            file=sys.stderr,
        )
        return 2

    try:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if device == "cuda" else torch.float32
        pipe = StableDiffusionXLPipeline.from_pretrained(
            model_id,
            torch_dtype=dtype,
            use_safetensors=True,
            variant="fp16" if device == "cuda" else None,
        )
        pipe = pipe.to(device)

        generator = torch.Generator(device=device).manual_seed(seed)
        image = pipe(
            prompt=prompt,
            negative_prompt=negative_prompt or None,
            width=width,
            height=height,
            num_inference_steps=steps,
            generator=generator,
        ).images[0]

        output = io.BytesIO()
        image.save(output, format="PNG")
        encoded = base64.b64encode(output.getvalue()).decode("ascii")
    except Exception as exc:
        print(json.dumps({"error": "SDXL generation failed.", "details": str(exc)}), file=sys.stderr)
        return 1

    print(
        json.dumps(
            {
                "image": f"data:image/png;base64,{encoded}",
                "mimeType": "image/png",
                "modelId": model_id,
                "seed": seed,
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
