import json
import sys

def main() -> int:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError as exc:
        print(json.dumps({"error": f"Invalid JSON input: {exc}"}), file=sys.stderr)
        return 2

    model_id = payload.get("modelId") or "google/gemma-4-E4B-it"
    prompt = payload.get("prompt") or ""
    messages = payload.get("messages") or []
    max_new_tokens = int(payload.get("maxNewTokens") or 512)
    temperature = float(payload.get("temperature") or 0.7)

    try:
        import torch
        from transformers import AutoTokenizer, AutoModelForCausalLM
    except Exception as exc:
        print(
            json.dumps(
                {
                    "error": (
                        "Python dependencies missing: install torch, transformers."
                    ),
                    "details": str(exc),
                }
            ),
            file=sys.stderr,
        )
        return 2

    try:
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32,
            device_map="auto",
        )

        if not messages:
            messages = [{"role": "user", "content": prompt}]
        
        # Ensure correct message format for Gemma
        input_ids = tokenizer.apply_chat_template(
            messages,
            add_generation_prompt=True,
            return_tensors="pt"
        ).to(model.device)

        generation_kwargs = {
            "max_new_tokens": max_new_tokens,
            "do_sample": temperature > 0,
        }
        if temperature > 0:
            generation_kwargs["temperature"] = temperature
            generation_kwargs["top_k"] = 50
            generation_kwargs["top_p"] = 0.95

        with torch.inference_mode():
            outputs = model.generate(input_ids, **generation_kwargs)
        
        response = tokenizer.decode(outputs[0][input_ids.shape[-1]:], skip_special_tokens=True)
        
    except Exception as exc:
        print(json.dumps({"error": "Gemma inference failed.", "details": str(exc)}), file=sys.stderr)
        return 1

    print(json.dumps({"response": response, "modelId": model_id}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
