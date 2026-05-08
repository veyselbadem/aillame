import argparse
import base64
import io
import json
import os
import random
import sys


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--request", help="Path to JSON request file")
    args, unknown = parser.parse_known_args()

    try:
        if args.request and os.path.exists(args.request):
            with open(args.request, "r", encoding="utf-8") as f:
                payload = json.load(f)
        else:
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
                    "success": False,
                    "error": "Python dependencies missing: install torch, diffusers, transformers, accelerate, safetensors, and pillow.",
                    "details": str(exc),
                }
            ),
            file=sys.stdout,
        )
        return 2

    try:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if device == "cuda" else torch.float32
        
        # Determine if model_id is a file or a folder
        if os.path.isfile(model_id) or model_id.endswith(".safetensors"):
            pipe = StableDiffusionXLPipeline.from_single_file(
                model_id,
                torch_dtype=dtype,
                use_safetensors=True,
            )
        else:
            pipe = StableDiffusionXLPipeline.from_pretrained(
                model_id,
                torch_dtype=dtype,
                use_safetensors=True,
                variant="fp16" if device == "cuda" else None,
            )
        
        pipe = pipe.to(device)

        # Optimization for SDXL Turbo if steps are very low
        if steps <= 4:
            pipe.upcast_vae() # Helpful for some turbo variants

        generator = torch.Generator(device=device).manual_seed(seed)
        image = pipe(
            prompt=prompt,
            negative_prompt=negative_prompt or None,
            width=width,
            height=height,
            num_inference_steps=steps,
            generator=generator,
            guidance_scale=0.0 if steps <= 4 else 7.5, # SDXL Turbo uses 0.0 guidance
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
                "success": True,
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
