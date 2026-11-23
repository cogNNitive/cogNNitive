---
level: 3
parent_spec:
  name: "procedures_V_0-6-1"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/procedures/spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Ingest Audio"
slots:
  - { name: batch, kind: value, required: true }
  - { name: language, kind: value, required: false, default: "es" }
---

# NN Procedure

## NN Procedure: Ingest Audio
slug:: ingest-audio

# NN Work

## NN Work: Discover the audio files
slug:: discover-audio
step_type:: task
executor:: engine
command:: node -e "const fs=require('fs');fs.mkdirSync('staging',{recursive:true});fs.writeFileSync('staging/queue-{batch}.txt','a.wav\nb.wav\n')"
output:: @audio-queue
next:: @transcribe

## NN Work: Transcribe the queue
slug:: transcribe
step_type:: task
executor:: engine
command:: node -e "const fs=require('fs');const l=fs.readFileSync('staging/queue-{batch}.txt','utf8').split('\n').filter(Boolean);fs.writeFileSync('staging/{batch}-transcript.md',l.map(f=>'## '+f+'\nTranscript of '+f+' in {language}.\n').join('\n'))"
input:: @audio-queue
output:: @raw-transcript
next:: @review-transcript

## NN Work: Review the transcript
slug:: review-transcript
step_type:: decision
executor:: human
decision:: Is the transcript of batch {batch} good enough to normalize?
input:: @raw-transcript
next:: [@normalize, @discard]

## NN Work: Normalize into a source
slug:: normalize
step_type:: task
executor:: agent
condition:: outcome == approve
input:: @raw-transcript

## NN Work: Discard the batch
slug:: discard
step_type:: task
executor:: agent
condition:: outcome == reject

# NN Artifact

## NN Artifact: Audio Queue
slug:: audio-queue
verify:: file:staging/queue-{batch}.txt

## NN Artifact: Raw Transcript
slug:: raw-transcript
verify:: file:staging/{batch}-transcript.md
