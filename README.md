name: Buat Video

on:
  workflow_dispatch:
    inputs:
      episode:
        description: "Episode (mis. 01-listrik). Kosong = semua"
        required: false
  push:
    paths: ["episodes/**"]

permissions:
  contents: write

jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Pasang alat suara dan font
        run: |
          pip install edge-tts piper-tts
          sudo apt-get update
          sudo apt-get install -y fonts-noto-color-emoji ffmpeg
          sudo apt-get install -y fonts-inter || true

      - name: Unduh model suara Piper (cadangan)
        continue-on-error: true
        run: |
          mkdir -p piper
          B=https://huggingface.co/rhasspy/piper-voices/resolve/main/id/id_ID/news_tts/medium
          curl -fL -o piper/id.onnx "$B/id_ID-news_tts-medium.onnx"
          curl -fL -o piper/id.onnx.json "$B/id_ID-news_tts-medium.onnx.json"

      - name: Simpan suara agar tidak dibuat ulang
        uses: actions/cache@v4
        with:
          path: public/audio
          key: audio-${{ github.run_id }}
          restore-keys: audio-

      - name: Tentukan episode
        id: ep
        env:
          INPUT_EP: ${{ github.event.inputs.episode }}
          EVENT: ${{ github.event_name }}
        run: |
          if [ "$EVENT" = "workflow_dispatch" ]; then
            LIST="$INPUT_EP"
          else
            LIST=$(git diff --name-only HEAD~1 HEAD -- episodes | sed 's#episodes/##; s#\.json##' | paste -sd, -)
          fi
          echo "list=$LIST" >> "$GITHUB_OUTPUT"

      - run: npm install

      - name: Render video
        env:
          AZURE_SPEECH_KEY: ${{ secrets.AZURE_SPEECH_KEY }}
          AZURE_SPEECH_REGION: ${{ secrets.AZURE_SPEECH_REGION }}
          ELEVENLABS_API_KEY: ${{ secrets.ELEVENLABS_API_KEY }}
          LIST: ${{ steps.ep.outputs.list }}
        run: |
          if [ -f piper/id.onnx ]; then export PIPER_MODEL=piper/id.onnx; fi
          REQUIRE_VOICE=1 node scripts/build.mjs "$LIST"

      - name: Rilis video
        env:
          GH_TOKEN: ${{ github.token }}
          RUN_NO: ${{ github.run_number }}
          SHA: ${{ github.sha }}
        run: |
          gh release create "video-$RUN_NO" out/*.mp4 \
            --target "$SHA" \
            --title "Video $RUN_NO" \
            --notes "Video siap diunduh."