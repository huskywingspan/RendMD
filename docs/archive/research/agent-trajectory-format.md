# Agent Trajectory Format (ATF)

> **Status:** Early Research & Planning  
> **Date:** 2026-02-09  
> **Authors:** RendMD Project  
> **License:** TBD (targeting MIT or Apache 2.0)

---

## Executive Summary

There is no standard, portable file format for storing AI agent execution traces. Every framework — OpenAI, Anthropic, LangChain, SWE-agent, AutoGen — invents its own incompatible schema. This makes it impossible to merge trajectory datasets for training, benchmark agents across frameworks, or create portable audit trails.

**Agent Trajectory Format (ATF)** is a proposed open, binary file format for storing complete agent execution traces — the "GGUF of agent behavior data." It would be self-describing, streamable, framework-neutral, and designed to serve both ML training pipelines and human-readable inspection.

---

## Table of Contents

- [1. The Problem](#1-the-problem)
- [2. Who Has This Problem](#2-who-has-this-problem)
- [3. Landscape Analysis](#3-landscape-analysis)
- [4. What A Solution Looks Like](#4-what-a-solution-looks-like)
- [5. Design Principles](#5-design-principles)
- [6. Initial Data Model Sketch](#6-initial-data-model-sketch)
- [7. Open Questions](#7-open-questions)
- [8. Prior Art & Influences](#8-prior-art--influences)
- [9. Roadmap](#9-roadmap)
- [10. Why Us, Why Now](#10-why-us-why-now)

---

## 1. The Problem

When an AI agent runs — whether it's fixing a GitHub issue, browsing the web, writing code, or managing customer support — it produces a **trajectory**: a trace of everything it thought, every tool it called, every result it received, and whether it ultimately succeeded.

This trajectory data is **extraordinarily valuable**:

| Use Case | Why Trajectories Matter |
|----------|----------------------|
| **Training** | SFT/RLHF training data for the next generation of agent models |
| **Evaluation** | Did the agent solve the task? In how many steps? At what cost? |
| **Debugging** | Where exactly did the agent go wrong? |
| **Auditing** | Compliance-grade record of what an autonomous system did |
| **Benchmarking** | Apples-to-apples comparison of agents on the same tasks |
| **Sharing** | Publish trajectory datasets on HuggingFace for community use |

**The core problem:** Every framework stores this data differently, and no format captures all of it.

### The Fragmentation

The same conceptual trace — "agent reads a file, edits it, runs tests" — looks completely different depending on which ecosystem produced it:

**OpenAI** uses `function_call` / `function_call_output` message pairs with string-encoded JSON arguments and `call_id` linking. No place for agent reasoning, environment state, or timing.

**Anthropic** uses `tool_use` / `tool_result` content blocks nested inside messages. Arguments are proper JSON objects. Thinking is a sibling content block. Tool results go inside `user` messages. Incompatible with OpenAI's schema.

**SWE-agent** uses `.traj` files with `(thought, action, observation, state)` step tuples. Includes environment state and the full prompt sent to the LLM at each step. Completely different structure from either API format.

**LangChain / LangGraph** uses proprietary callback handlers and LangSmith traces with `AgentAction` / `AgentFinish` objects. Data lives in LangSmith's cloud — not a portable file format at all.

**OpenTelemetry GenAI Semantic Conventions** (v1.39, still "Development" status as of Feb 2026) defines span attributes for monitoring running agents. This is observability telemetry, not a persistent file format. Focused on individual API calls, missing reasoning traces, environment state, and evaluation signals.

### What No Existing Format Captures

| Dimension | OpenAI | Anthropic | SWE-agent | OTel GenAI | **Needed** |
|-----------|:------:|:---------:|:---------:|:----------:|:----------:|
| Messages / turns | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tool definitions | ✅ | ✅ | Partial | ✅ | ✅ |
| Tool calls + results | ✅ | ✅ | ✅ | ✅ | ✅ |
| Agent reasoning / CoT | ❌ | ✅ | ✅ | ❌ | ✅ |
| Environment state | ❌ | ❌ | ✅ | ❌ | ✅ |
| Full prompt per step | ❌ | ❌ | ✅ | Opt-in | ✅ |
| Wall-clock timing | ❌ | ❌ | ❌ | ✅ | ✅ |
| Token usage per step | ❌ | ❌ | ❌ | ✅ | ✅ |
| Cost per step | ❌ | ❌ | ❌ | Partial | ✅ |
| Success / failure signal | ❌ | ❌ | Separate | ❌ | ✅ |
| Branching / retry paths | ❌ | ❌ | ❌ | ❌ | ✅ |
| Embedded artifacts | ❌ | Partial | Separate | ❌ | ✅ |
| Nested sub-agents | ❌ | ❌ | ❌ | Partial | ✅ |
| Human preference labels | ❌ | ❌ | ❌ | ❌ | ✅ |

No single format covers even half the columns. **This is the gap.**

---

## 2. Who Has This Problem

### Primary Users

| User | Pain Point | Current Workaround |
|------|-----------|-------------------|
| **ML researchers** | Can't merge trajectory datasets from multiple sources for training | Write one-off conversion scripts per dataset |
| **Agent framework authors** (LangChain, CrewAI, AutoGen, etc.) | Each invents proprietary logging; users can't export portably | Framework lock-in; data trapped in vendor clouds |
| **Benchmark creators** (SWE-bench, WebArena, GAIA, HumanEval) | Each benchmark defines its own submission format | Evaluators write custom parsers per framework |
| **Enterprise AI teams** | No standard audit trail for agent actions (EU AI Act, SOC 2) | Ad-hoc JSON logging, often incomplete |
| **Agent developers** | Can't compare agent performance across providers/models | Manual testing and gut feel |
| **Open source community** | Trajectory datasets on HuggingFace are all incompatible | Every dataset has a README explaining its bespoke schema |

### Evidence of Pain

- SWE-agent v1.1.0 released "tens of thousands of training trajectories" — locked in `.traj` format only SWE-agent understands
- HuggingFace has 7+ datasets tagged "agent trajectory" — all with different schemas
- Reddit post "How many hours did you spend formatting data for fine-tuning?" — 34 upvotes, 42 comments of frustration
- OpenTelemetry's GenAI conventions are still in "Development" status after 2+ years, proving the community *recognizes* the gap but hasn't solved it at the file format level
- Every new agent framework (Devin, OpenHands, Aider, Claude Code) invents yet another logging format

---

## 3. Landscape Analysis

### Existing Formats We Studied

| Format | Domain | Created By | Strengths | Why It's Not Enough |
|--------|--------|-----------|-----------|-------------------|
| **GGUF** | Model weights (inference) | ggerganov / llama.cpp | Self-describing binary, KV metadata, mmap-able, versioned | Stores tensor data, not behavioral traces |
| **safetensors** | Model weights (training) | HuggingFace | Safe (no pickle), fast (zero-copy), JSON header | Tensor-only, no metadata beyond tensor names |
| **Parquet / Arrow** | Tabular datasets | Apache | Columnar, compressed, fast scans, mature ecosystem | Flat table structure can't represent DAG-shaped traces |
| **JSONL** | Training data (conversations) | Ad-hoc convention | Human-readable, appendable | Completely fragmented schemas; no binary artifacts; slow for large datasets |
| **SWE-agent .traj** | Agent trajectories | Princeton NLP | Captures thought/action/observation/state/query | SWE-agent specific; plain JSON; no binary embedding |
| **OTel GenAI spans** | Runtime observability | OpenTelemetry / CNCF | Industry-backed, provider-agnostic attribute schema | Not a file format; ephemeral telemetry; missing reasoning/eval signals |
| **Ollama Modelfile** | Local inference config | Ollama | Bundles model + system prompt + parameters | Proprietary to Ollama; config not trajectory data |

### Key Insight

There are well-established formats for **what a model is** (GGUF, safetensors) and **what data looks like** (Parquet, JSONL). There is **no established format for what a model did** — the behavioral trace of an AI system in action. ATF fills this gap.

---

## 4. What A Solution Looks Like

### The ATF Vision

A binary file format (`.atf`) that is:

1. **Self-describing** — Contains all metadata needed to understand the trace without external documentation
2. **Framework-neutral** — Normalizes tool calls, messages, and artifacts across OpenAI, Anthropic, MCP, etc.
3. **DAG-structured** — Supports branching, retries, and sub-agent hierarchies (not just a flat list)
4. **Streamable** — Can be written incrementally as an agent runs (append-only during recording)
5. **Dual-purpose** — Serves ML training pipelines (fast batch reads) AND human inspection (renders as readable document)
6. **Embeddable** — Code diffs, images, terminal output, and other artifacts stored inline
7. **Evaluatable** — Built-in fields for success signals, reward scores, human preference labels

### Conceptual Structure

```
┌─────────────────────────────────────────┐
│  ATF Header                             │
│  ├─ Magic number (file identification)  │
│  ├─ Format version                      │
│  └─ Metadata KV pairs                   │
│     ├─ agent.name                       │
│     ├─ agent.framework                  │
│     ├─ model.name                       │
│     ├─ model.provider                   │
│     ├─ task.description                 │
│     ├─ task.id                          │
│     ├─ eval.success (bool)              │
│     ├─ eval.reward (float)              │
│     ├─ timing.start_utc                 │
│     ├─ timing.end_utc                   │
│     ├─ tokens.total_input               │
│     ├─ tokens.total_output              │
│     └─ ...extensible                    │
├─────────────────────────────────────────┤
│  Tool Definitions Table                 │
│  (schemas for all tools available)      │
├─────────────────────────────────────────┤
│  Step Records (DAG)                     │
│  ├─ Step 0: user_message               │
│  ├─ Step 1: thought (reasoning)         │
│  ├─ Step 2: tool_call → Step 3          │
│  ├─ Step 3: tool_result                 │
│  ├─ Step 4: state_snapshot              │
│  ├─ Step 5: thought                     │
│  ├─ Step 6: tool_call → Step 7          │
│  ├─ Step 7: tool_result                 │
│  ├─ Step 8: assistant_message (final)   │
│  └─ ...                                 │
├─────────────────────────────────────────┤
│  Artifact Blobs                         │
│  (embedded diffs, images, files,        │
│   terminal output, etc.)                │
└─────────────────────────────────────────┘
```

### Step Types (Initial Taxonomy)

| Step Type | Description | Key Fields |
|-----------|------------|------------|
| `user_message` | Human input to the agent | content, timestamp |
| `thought` | Agent's internal reasoning / chain-of-thought | content, timestamp |
| `tool_call` | Agent invokes a tool | tool_name, arguments, call_id, timestamp |
| `tool_result` | Result returned from tool execution | call_id, output, is_error, duration_ms |
| `assistant_message` | Agent's response to the user | content, finish_reason, timestamp |
| `state_snapshot` | Environment state at a point in time | key-value state data |
| `branch_point` | Agent chose between multiple paths | children_ids, selection_reason |
| `sub_agent_invoke` | Agent spawns a child agent | child_agent_name, child_trace_ref |
| `eval_signal` | Evaluation annotation (human or automated) | score, label, annotator |

---

## 5. Design Principles

### Learned from GGUF

GGUF's success comes from clear design choices we should emulate:

1. **Magic number** — Instant file identification (`GGUF` → `ATF\0` or similar)
2. **Version field** — Forward compatibility from day one
3. **KV metadata** — Extensible without breaking the format
4. **Alignment** — Tensor data aligned for mmap; we align artifacts similarly
5. **Single file** — Everything in one file, no sidecar files

### Learned from GGUF's Mistakes

GGUF's own spec has literal TODOs we can avoid:

- LoRA metadata: undefined → **ATF should handle nested/composed traces from day one**
- Prompting metadata: undefined → **ATF embeds the full prompt context per step**
- Computation graph: "future extension" → **ATF's DAG structure is core, not an afterthought**

### Unique Principles for ATF

6. **Append-only recording** — An agent writes steps as it goes; the file is valid at any point (like a WAL)
7. **Lossless round-trip** — Converting OpenAI → ATF → OpenAI preserves all original fields
8. **Framework-specific extensions** — Normalized core + optional provider-specific metadata (like GGUF's `[llm].` prefix pattern)
9. **Human-readable projection** — A tool can render any `.atf` file as a readable markdown document showing what the agent did
10. **Training-pipeline friendly** — Batch-readable, supports columnar access patterns for ML workflows

---

## 6. Initial Data Model Sketch

> ⚠️ **This is a rough sketch, not a specification.** The real spec will emerge from cataloging the union of all existing formats.

### Header

```
struct atf_header {
    uint32_t magic;           // 'ATF\0' or chosen magic bytes
    uint32_t version;         // Format version (start at 1)
    uint64_t step_count;      // Number of steps in this trace
    uint64_t metadata_kv_count;
    atf_kv   metadata_kv[];   // Extensible key-value metadata
};
```

### Metadata Keys (Standardized)

```
# Agent identity
agent.name              : string    # "SWE-agent", "Claude Code", "my-bot"
agent.framework         : string    # "langchain", "autogen", "custom"
agent.version           : string    # "1.1.0"

# Model info
model.name              : string    # "claude-sonnet-4-20250514", "gpt-4.1"
model.provider          : string    # "anthropic", "openai", "local"
model.parameters        : json      # {temperature: 0.0, max_tokens: 4096, ...}

# Task context
task.id                 : string    # "django__django-11905" (SWE-bench style)
task.description        : string    # The problem statement / user request
task.source             : string    # "swe-bench", "webarena", "production"

# Evaluation
eval.success            : bool      # Did the agent accomplish the task?
eval.reward             : float     # Scalar reward signal
eval.human_preference   : int       # Human preference rank (for RLHF)
eval.metrics            : json      # {steps: 7, tests_passed: 42, ...}

# Timing & cost
timing.start_utc        : uint64    # Unix timestamp, milliseconds
timing.end_utc          : uint64
timing.total_ms         : uint64
tokens.total_input      : uint64
tokens.total_output     : uint64
cost.total_usd          : float     # Total API cost

# Provenance
source.format           : string    # "openai", "anthropic", "swe-agent-traj"
source.converted_at     : uint64    # When was this converted to ATF?
```

### Step Record

```
struct atf_step {
    uint64_t step_id;         // Unique within this trace
    uint64_t parent_id;       // For DAG structure (0 = root)
    uint8_t  step_type;       // Enum: user_message, thought, tool_call, etc.
    uint64_t timestamp_ms;    // When this step occurred
    uint32_t content_length;  // Length of content blob
    uint8_t  content[];       // Step-type-specific payload (MessagePack or similar)
    uint32_t artifact_count;  // Number of embedded artifacts
    atf_artifact_ref artifacts[]; // References to artifact blobs
};
```

### Tool Call Normalization

One of ATF's key contributions — a normalized representation that maps to/from all providers:

```json
{
    "tool_name": "read_file",
    "tool_id": "call_abc123",
    "arguments": {
        "path": "src/auth.py",
        "start_line": 1,
        "end_line": 50
    },
    "source_format": "openai",
    "source_raw": { ... }
}
```

The `arguments` field is always a proper JSON object (never string-encoded). The original provider format is preserved in `source_raw` for lossless round-tripping.

---

## 7. Open Questions

### Format Decisions

- [ ] **Binary encoding for step payloads** — MessagePack? CBOR? FlatBuffers? Or keep JSON for simplicity and compress the whole file?
- [ ] **Artifact storage** — Inline blobs with offset table (like GGUF tensors)? Or separate section at end of file?
- [ ] **Compression** — Per-step? Per-section? Whole-file? zstd? lz4?
- [ ] **Maximum file size** — Should one `.atf` file contain one trajectory or support batches (like Parquet row groups)?
- [ ] **Streaming protocol** — If agents write ATF incrementally, how do we handle the step_count in the header? (Write 0, update on close? Use a trailer?)

### Schema Decisions

- [ ] **Canonical tool schema** — How do we normalize tool definitions across OpenAI (JSON Schema), Anthropic (input_schema), and MCP?
- [ ] **Thinking/reasoning representation** — Anthropic has `thinking` blocks, SWE-agent has `thought` strings, OpenAI has `reasoning` items. How to unify?
- [ ] **State representation** — SWE-agent tracks open files and working directory. Other agents track different state. Generic KV? Typed state schemas?
- [ ] **Multi-modal content** — How to represent images, audio, video within steps? Reference by artifact ID? Inline base64?
- [ ] **Conversation threading** — Some agents have true multi-turn conversations. Others are single-shot. How to handle both?

### Ecosystem Decisions

- [ ] **Reference implementation language** — Python (for ML ecosystem)? Rust (for performance)? Both?
- [ ] **File extension** — `.atf`? `.trajectory`? `.atr`?
- [ ] **Relationship to OTel** — Complementary? Should ATF be exportable from OTel GenAI spans? Import into OTel?
- [ ] **Governance** — Open spec under a foundation? Or informal community-maintained like GGUF?
- [ ] **Versioning strategy** — How to evolve the format without breaking readers?

### Research Needed

- [ ] **Catalog the field union** — Take real trajectory data from OpenAI, Anthropic, SWE-agent, LangChain, AutoGen and exhaustively list every field. This becomes the schema basis.
- [ ] **Interview framework authors** — What would LangChain, CrewAI, or AutoGen want from a trajectory format?
- [ ] **Profile training pipeline needs** — What access patterns do ML training loops need? Sequential scan? Random access? Columnar?
- [ ] **Survey academic trajectory datasets** — What schemas do SWE-bench, WebArena, GAIA, AgentBench use?
- [ ] **Evaluate binary format options** — Build small prototypes with MessagePack, FlatBuffers, and plain compressed JSON. Benchmark read/write speed and file size.

---

## 8. Prior Art & Influences

| Influence | What We Take From It |
|-----------|---------------------|
| **GGUF** (ggerganov) | Magic number, versioned header, KV metadata, single-file philosophy, alignment for mmap |
| **safetensors** (HuggingFace) | JSON header + binary blobs pattern, safety-first design (no arbitrary code execution) |
| **Parquet** (Apache) | Columnar access patterns, row groups for batching, rich type system |
| **SWE-agent .traj** | The (thought, action, observation, state) tuple as a step model; full query logging |
| **OTel GenAI SemConv** | Provider-agnostic attribute naming; `gen_ai.*` namespace pattern |
| **Git object model** | Content-addressed storage, DAG structure, trees of blobs |
| **Markdown** | Human-readable source format; the idea that structured data should also be readable |
| **ProseMirror document model** | Typed nodes with attributes; schema-validated structure |
| **WAL (Write-Ahead Log)** | Append-only, crash-safe incremental writing |

---

## 9. Roadmap

### Phase 0: Research (Current)
- [x] Identify the problem space
- [x] Survey existing formats and their gaps  
- [x] Confirm no existing solution covers this adequately
- [x] Document initial concept (this document)
- [ ] Catalog the complete field union across all major frameworks
- [ ] Research binary format options (MessagePack vs CBOR vs FlatBuffers vs compressed JSON)
- [ ] Study academic trajectory datasets and schemas

### Phase 1: Specification Draft
- [ ] Write formal ATF specification v0.1 (inspired by GGUF's spec document)
- [ ] Define the canonical step type taxonomy
- [ ] Define the tool call normalization schema
- [ ] Define metadata key conventions
- [ ] Publish spec for community feedback

### Phase 2: Reference Implementation
- [ ] Python library: `atf-python` — read, write, convert ATF files
- [ ] Converters: OpenAI → ATF, Anthropic → ATF, SWE-agent .traj → ATF
- [ ] CLI tool: `atf inspect <file>` — human-readable trajectory viewer
- [ ] CLI tool: `atf convert <input> --from openai --to atf`
- [ ] Validation: `atf validate <file>` — check format compliance

### Phase 3: Ecosystem Integration
- [ ] HuggingFace dataset viewer support
- [ ] LangChain/LangGraph callback handler that writes ATF
- [ ] Training data loader (PyTorch Dataset, HuggingFace datasets)
- [ ] Markdown renderer: `atf render <file> --format markdown` — renders trajectory as readable document
- [ ] VS Code extension: ATF file viewer

### Phase 4: Community & Adoption
- [ ] Publish spec + reference implementation on GitHub
- [ ] Write blog post / paper explaining the format
- [ ] Propose to SWE-bench, WebArena as optional submission format
- [ ] Engage with OTel GenAI working group about ATF ↔ OTel interop
- [ ] Submit to relevant academic venues

---

## 10. Why Us, Why Now

### Why the RendMD team?

This might seem like an unusual project to come from a markdown editor team. But consider:

1. **We understand document formats.** RendMD's entire existence is about transforming between representations — rendered ↔ source, visual ↔ structural. ATF has the same duality: binary trace ↔ readable document.

2. **We understand schemas.** TipTap/ProseMirror's document model is a typed node tree with attributes and content — exactly the kind of thinking needed to design a step record schema.

3. **We believe in open formats.** RendMD's philosophy is that your data should be portable. Markdown files, not proprietary blobs. ATF carries the same principle: your agent's behavior data should belong to you, in a format anyone can read.

4. **We ship.** RendMD v1.0.5 is deployed. We know how to take an idea from spec to working software.

### Why February 2026?

- **Agents are the dominant AI paradigm.** Every major AI company has shipped agents (OpenAI Codex, Claude Code, Gemini agents, SWE-agent, Devin). The data exists — it's just trapped in silos.
- **The training data bottleneck is now.** The next frontier is training models to be *better agents*, requiring massive pooled trajectory datasets. Without a standard format, the community can't collaborate.
- **EU AI Act compliance deadlines are approaching.** Article 14's "human oversight" requirements for high-risk AI need audit trails. There's no standard format for them.
- **OTel GenAI conventions prove the gap is recognized** — but they explicitly solve observability, not persistence. The file format problem remains unsolved.
- **SWE-agent generates 10,000+ trajectories per experiment.** The volume of data is already there. It just needs a common format.

### The Open Source Bet

We don't need to get this perfect. If the problem is real and the initial design is sound, the open source community will refine it. GGUF started as one person's (ggerganov's) solution to a real problem. It became the standard because the problem was genuine and the design was pragmatic.

ATF aims for the same: **solve a real problem with a pragmatic design, then let the community make it great.**

---

## Appendix A: Real-World Format Examples

### OpenAI Tool Call (actual API format)
```json
[
    {
        "id": "fc_12345xyz",
        "call_id": "call_12345xyz",
        "type": "function_call",
        "name": "get_weather",
        "arguments": "{\"location\":\"Paris, France\"}"
    }
]
```
Note: `arguments` is a **string-encoded** JSON object. This is a major pain point.

### Anthropic Tool Use (actual API format)
```json
{
    "role": "assistant",
    "content": [
        {"type": "thinking", "thinking": "I should check the weather..."},
        {"type": "tool_use", "id": "toolu_abc", "name": "get_weather",
         "input": {"location": "Paris, France"}}
    ]
}
```
Note: `input` is a **proper JSON object**. Thinking is a sibling block. Structurally incompatible with OpenAI.

### SWE-agent Trajectory Step (actual .traj format)
```json
{
    "response": "We should look at the source file...",
    "thought": "We should look at the source file...",
    "action": "open src/auth.py\n",
    "observation": "File contents here...",
    "state": "{\"open_file\": \"/repo/src/auth.py\", \"working_dir\": \"/repo\"}",
    "query": [{"role": "system", "content": "You are a helpful assistant..."}]
}
```
Note: Completely different model. Includes environment state and full LLM prompt — fields no API format captures.

### ATF Normalized Step (what we'd produce)
```json
{
    "step_id": 3,
    "parent_id": 2,
    "step_type": "tool_call",
    "timestamp_ms": 1739145600000,
    "tool_name": "open_file",
    "tool_id": "call_003",
    "arguments": {
        "path": "src/auth.py"
    },
    "source_format": "swe-agent",
    "duration_ms": null,
    "token_usage": {"input": 1523, "output": 45}
}
```
Clean, normalized, with provenance. Carries everything useful, maps back to the original.

---

## Appendix B: Name Candidates

| Name | Extension | Pros | Cons |
|------|-----------|------|------|
| Agent Trajectory Format | `.atf` | Descriptive, clear acronym | "ATF" has other associations |
| Trajectory Exchange Format | `.txf` | Emphasizes interop | Less intuitive |
| Agent Trace | `.trace` | Short, intuitive | Generic; conflicts with OS trace files |
| Agent Record Format | `.arf` | Clean, professional | Less descriptive |
| Open Agent Trajectory | `.oat` | Emphasizes openness | Sounds like a cereal |

**Current working name: ATF (`.atf`)**

---

*This document is a living research artifact. It will evolve as we catalog existing formats, prototype the binary structure, and gather community feedback.*
