import base64
import io
import json
import sys


def load_image(data_url: str):
    try:
      from PIL import Image
    except Exception as exc:
      raise RuntimeError("Python dependency missing: install pillow.") from exc

    _, encoded = data_url.split(",", 1)
    return Image.open(io.BytesIO(base64.b64decode(encoded))).convert("RGB")


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError as exc:
        print(json.dumps({"error": f"Invalid JSON input: {exc}"}), file=sys.stderr)
        return 2

    model_id = payload.get("modelId") or "Qwen/Qwen3-VL-8B-Instruct"
    prompt = payload.get("prompt") or "Describe this image."
    image_payloads = payload.get("images") or []
    max_new_tokens = int(payload.get("maxNewTokens") or 512)
    temperature = float(payload.get("temperature") or 0.7)

    try:
        import torch
        from transformers import AutoProcessor, Qwen3VLForConditionalGeneration
    except Exception as exc:
        print(
            json.dumps(
                {
                    "error": (
                        "Python dependencies missing: install torch, transformers from a "
                        "Qwen3-VL compatible release, and pillow."
                    ),
                    "details": str(exc),
                }
            ),
            file=sys.stderr,
        )
        return 2

    try:
        processor = AutoProcessor.from_pretrained(model_id, trust_remote_code=True)
        model = Qwen3VLForConditionalGeneration.from_pretrained(
            model_id,
            dtype="auto",
            device_map="auto",
            trust_remote_code=True,
        )

        content = []
        images = []
        for image_payload in image_payloads:
            image = load_image(image_payload["dataUrl"])
            images.append(image)
            content.append({"type": "image", "image": image})
        content.append({"type": "text", "text": prompt})

        messages = [{"role": "user", "content": content}]
        inputs = processor.apply_chat_template(
            messages,
            tokenize=True,
            add_generation_prompt=True,
            return_dict=True,
            return_tensors="pt",
        )
        inputs = inputs.to(model.device)

        generation_kwargs = {
            "max_new_tokens": max_new_tokens,
            "do_sample": temperature > 0,
        }
        if temperature > 0:
            generation_kwargs["temperature"] = temperature

        with torch.inference_mode():
            generated_ids = model.generate(**inputs, **generation_kwargs)

        trimmed = [
            output_ids[len(input_ids):]
            for input_ids, output_ids in zip(inputs.input_ids, generated_ids)
        ]
        output_text = processor.batch_decode(
            trimmed,
            skip_special_tokens=True,
            clean_up_tokenization_spaces=False,
        )[0]
    except Exception as exc:
        print(json.dumps({"error": "Qwen3-VL inference failed.", "details": str(exc)}), file=sys.stderr)
        return 1

    print(json.dumps({"response": output_text, "modelId": model_id}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
