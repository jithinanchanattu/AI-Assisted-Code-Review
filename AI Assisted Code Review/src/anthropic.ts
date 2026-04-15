import tl = require('azure-pipelines-task-lib/task');
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicReviewer {
    private readonly systemMessage: string;
    private readonly supportedModels: string[] = [
        'claude-opus-4-6',
        'claude-sonnet-4-6',
        'claude-haiku-4-5-20251001',
        'claude-3-5-sonnet-latest',
        'claude-3-5-haiku-latest',
        'claude-3-opus-latest',
    ];

    constructor(
        private _client: Anthropic,
        checkForBugs: boolean = false,
        checkForPerformance: boolean = false,
        checkForBestPractices: boolean = false,
        additionalPrompts: string[] = [],
        private maxTokens: number = 4096,
        systemPromptOverride?: string
    ) {
        console.log(`AnthropicReviewer initialized with max tokens: ${maxTokens}`);

        if (systemPromptOverride) {
            this.systemMessage = systemPromptOverride;
        } else {
            this.systemMessage = `Your task is to act as a code reviewer of a Pull Request:
        - Use bullet points if you have multiple comments.
        ${checkForBugs ? '- If there are any bugs, highlight them.' : null}
        ${checkForPerformance ? '- If there are major performance problems, highlight them.' : null}
        ${checkForBestPractices ? '- Provide details on missed use of best-practices.' : null}
        ${additionalPrompts.length > 0 ? additionalPrompts.map(str => `- ${str}`).join('\n') : null}
        - Do not highlight minor issues and nitpicks.
        - Only provide instructions for improvements
        - If you have no instructions respond with NO_COMMENT only, otherwise provide your instructions.

        You are provided with the code changes (diffs) in a unidiff format.

        The response should be in markdown format.`;
        }
    }

    public async PerformCodeReview(diff: string, fileName: string): Promise<string> {
        let model = tl.getInput('ai_model', true) as string;

        if (!this.supportedModels.includes(model)) {
            tl.warning(`The specified model "${model}" is not in the known Anthropic models list. Proceeding with caution.`);
        }

        if (this.estimateTokens(diff + this.systemMessage) > this.maxTokens) {
            tl.warning(`The diff for file ${fileName} likely exceeds the token limit of ${this.maxTokens}. Skipping review.`);
            return 'NO_COMMENT';
        }

        try {
            console.log('Request payload:', {
                system: this.systemMessage,
                messages: [{ role: 'user', content: diff }],
                model: model,
                max_tokens: this.maxTokens
            });

            const response = await this._client.messages.create({
                model: model,
                max_tokens: this.maxTokens,
                system: this.systemMessage,
                messages: [{ role: 'user', content: diff }]
            });

            if (response.content.length > 0 && response.content[0].type === 'text') {
                return response.content[0].text;
            }
        } catch (error: any) {
            tl.error(`Error during Anthropic API call: ${error.message}`);
            if (error.response) {
                console.error('API response:', error.response);
            }
            return 'NO_COMMENT';
        }

        tl.warning(`No text content returned from Anthropic API for file ${fileName}.`);
        return 'NO_COMMENT';
    }

    // Character-based token estimate (Anthropic uses its own tokenizer; ~3.5 chars/token is a safe upper bound)
    private estimateTokens(text: string): number {
        return Math.ceil(text.length / 3.5);
    }
}
