# AI-Assisted Code Review for Azure DevOps

## Elevate Your Code Review Process with AI

Welcome to the **AI-Assisted Code Review DevOps Extension**! Integrate leading AI models from **OpenAI** or **Anthropic** directly into your Azure DevOps pipeline for smart, efficient, and insightful code reviews on every pull request.

### Start Improving Your Code Reviews Today

Supercharge your workflow with AI-powered code reviews. Install the extension now and unlock intelligent, actionable insights for every code change.

## Why Use AI-Assisted Code Review?

- **Automated Code Analysis:** Eliminate manual inspections with AI-driven analysis that detects bugs, performance issues, and suggests best practices automatically.
- **Simple Installation:** Get started quickly with a one-click installation from the [Azure DevOps Marketplace](https://marketplace.visualstudio.com/items?itemName=AeriesSoftware.aeries-ai-assisted-code-review).
- **Multiple AI Providers:** Choose between OpenAI (GPT-4, GPT-3.5, etc.) or Anthropic (Claude Sonnet, Claude Opus, etc.) with a single configuration change.
- **Customizable System Prompt:** Override the built-in review prompt entirely via a pipeline variable — no code changes required.
- **Accelerated Review Cycles:** Save time by letting AI handle routine reviews, so your team can focus on what truly matters.
- **Flexible Configuration:** Configure the AI model, file exclusions, additional review prompts, and API endpoint to suit your environment.

## AI-Assisted Code Review - Flow Diagram
![image](https://github.com/user-attachments/assets/52f6a1b3-c1f3-4496-bb1f-857393d261ab)

## Prerequisites

- An [Azure DevOps Account](https://dev.azure.com/)
- An API key for your chosen provider:
  - [OpenAI API Key](https://platform.openai.com/docs/overview) for GPT models
  - [Anthropic API Key](https://console.anthropic.com/) for Claude models

## Getting Started

1. Install the AI Assisted Code Review DevOps Extension from the [Azure DevOps Marketplace](https://marketplace.visualstudio.com/items?itemName=AeriesSoftware.aeries-ai-assisted-code-review).
2. Add the AI Assisted Code Review Task to your pipeline:

   **OpenAI example:**
   ```yaml
   trigger:
     branches:
       exclude:
         - '*'

   pr:
     branches:
       include:
         - '*'

   jobs:
   - job: CodeReview
     pool:
       vmImage: 'ubuntu-latest'
     steps:
     - task: AIAssistedCodeReviewTask@1
       inputs:
         ai_provider: 'openai'
         api_key: $(OpenAI_ApiKey)
         ai_model: 'gpt-4o'
         bugs: true
         performance: true
         best_practices: true
         file_extensions: '.js,.ts,.css,.html'
         file_excludes: 'file1.js,file2.py,secret.txt'
         additional_prompts: 'Fix variable naming, Ensure consistent indentation, Review error handling approach'
   ```

   **Anthropic example:**
   ```yaml
   - task: AIAssistedCodeReviewTask@1
     inputs:
       ai_provider: 'anthropic'
       api_key: $(Anthropic_ApiKey)
       ai_model: 'claude-sonnet-4-6'
       bugs: true
       performance: true
       best_practices: true
   ```

3. If you do not already have Build Validation configured, add [Build validation](https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies?view=azure-devops&tabs=browser#build-validation) to your branch policy to trigger the code review when a Pull Request is created.

## Configuration Reference

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `ai_provider` | Yes | `openai` | AI provider to use: `openai` or `anthropic` |
| `api_key` | Yes | — | API key for the selected provider |
| `ai_model` | Yes | `gpt-3.5-turbo` | Model name (see [Selecting a Model](#selecting-a-model)) |
| `api_url` | No | *(provider default)* | Override the API endpoint URL |
| `bugs` | No | `true` | Check for bugs |
| `performance` | No | `true` | Check for performance problems |
| `best_practices` | No | `true` | Check for missed best practices |
| `file_extensions` | No | — | Comma-separated extensions to review, e.g. `.js,.ts` |
| `file_excludes` | No | — | Comma-separated filenames to exclude |
| `additional_prompts` | No | — | Extra review instructions (comma-separated) |
| `system_prompt` | No | — | Fully custom system prompt (see [Custom System Prompt](#custom-system-prompt)) |
| `max_tokens` | No | `8192` | Maximum tokens for the AI response |

## Selecting a Model

The `ai_model` input accepts any model name supported by the selected provider. If the model is not in the known list, a warning is logged but the task proceeds.

**OpenAI models:** `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-3.5-turbo`, etc.

**Anthropic models:** `claude-sonnet-4-6`, `claude-opus-4-6`, `claude-haiku-4-5-20251001`, `claude-3-5-sonnet-latest`, `claude-3-5-haiku-latest`, `claude-3-opus-latest`

```yaml
inputs:
  ai_provider: 'anthropic'
  api_key: $(Anthropic_ApiKey)
  ai_model: 'claude-sonnet-4-6'
```

## Custom System Prompt

The `system_prompt` input lets you replace the built-in review prompt with your own. When set, the `bugs`, `performance`, `best_practices`, and `additional_prompts` inputs are ignored — your prompt is used verbatim.

This is the recommended way to customize review behavior without modifying extension code. Store the prompt in a pipeline variable or variable group and reference it here.

```yaml
inputs:
  ai_provider: 'anthropic'
  api_key: $(Anthropic_ApiKey)
  ai_model: 'claude-sonnet-4-6'
  system_prompt: |
    You are a senior security engineer reviewing a pull request.
    Focus exclusively on security vulnerabilities, unsafe deserialization,
    injection risks, and missing input validation.
    Respond in markdown with bullet points.
    If there are no issues, respond with NO_COMMENT only.
```

Leave `system_prompt` blank to use the built-in dynamic prompt assembled from the `bugs`, `performance`, `best_practices`, and `additional_prompts` flags.

## Custom API URL

The `api_url` input overrides the default endpoint for the selected provider. Leave it blank to use the provider default (`https://api.openai.com/v1` for OpenAI, `https://api.anthropic.com` for Anthropic).

This is useful for proxies, Azure OpenAI Service deployments, or other OpenAI-compatible endpoints.

```yaml
inputs:
  ai_provider: 'openai'
  api_key: $(AzureOpenAI_ApiKey)
  api_url: 'https://my-deployment.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-08-01-preview'
  ai_model: 'gpt-4o'
```

## Maximum Tokens

The `max_tokens` input sets the maximum number of tokens for the AI response. Files whose diff exceeds this limit are skipped to avoid API errors.

```yaml
inputs:
  ai_model: 'gpt-4o'
  max_tokens: '8192'
```

The default is `8192`. Set this to match the context window of your chosen model.

---

## Enabling Access to Other Foundation Models via AWS Bedrock

To use models through [AWS Bedrock](https://aws.amazon.com/bedrock/), use the [Bedrock Access Gateway](https://github.com/aws-samples/bedrock-access-gateway) project to expose a OpenAI-compatible endpoint and point `api_url` at it.

```yaml
inputs:
  ai_provider: 'openai'
  api_key: $(BedrockApiKey)
  api_url: 'https://your-bedrock-access-gateway-endpoint'
  ai_model: 'amazon.titan-text'
  max_tokens: '8192'
```

For more details, visit the [Bedrock Access Gateway GitHub repository](https://github.com/aws-samples/bedrock-access-gateway).

## FAQ

### Q: What agent job settings are required?

A: Ensure that "Allow scripts to access OAuth token" is enabled as part of the agent job. Follow the [documentation](https://learn.microsoft.com/en-us/azure/devops/pipelines/build/options?view=azure-devops#allow-scripts-to-access-the-oauth-token) for more details.

### Q: What permissions are required for Build Administrators?

A: Build Administrators must be given "Contribute to pull requests" access. Check [this Stack Overflow answer](https://stackoverflow.com/a/57985733) for guidance on setting up permissions.

### Bug Reports

If you find a bug or unexpected behavior, please [open a bug report](https://github.com/jameslancaster/AI-Assisted-Code-Review/issues/new?assignees=&labels=bug&template=bug_report.md&title=).

### Feature Requests

If you have ideas for new features or enhancements, please [submit a feature request](https://github.com/jameslancaster/AI-Assisted-Code-Review/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=).

## License

This project is licensed under the [MIT License](LICENSE).

If you would like to contribute to the development of this extension, please follow our contribution guidelines.
