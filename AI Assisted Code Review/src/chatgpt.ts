import tl = require('azure-pipelines-task-lib/task');
import { encode } from 'gpt-tokenizer';
import OpenAI from "openai";

export class ChatGPT {
    private readonly systemMessage: string = '';
    private readonly apiUrl: string;
    private readonly supportedModels: string[] = [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4o-2024-11-20',
        'gpt-4o-2024-08-06',
        'gpt-4o-2024-05-13',
        'gpt-4o-mini-2024-07-18',
        'gpt-4-turbo',
        'gpt-4-turbo-2024-04-09',
        'gpt-4-1106-preview',
        'gpt-4',
        'gpt-4-0613',
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-0125',
        'gpt-3.5-turbo-1106'
    ];

    constructor(
        private _openAi: OpenAI,
        checkForBugs: boolean = false,
        checkForPerformance: boolean = false,
        checkForBestPractices: boolean = false,
        additionalPrompts: string[] = [],
        apiUrl: string = 'https://api.openai.com/v1', // Default OpenAI API URL
        private maxTokens: number = 4096, // Default maximum tokens
        systemPromptOverride?: string
    ) {
        this.apiUrl = apiUrl;

        console.log(`ChatGPT initialized with API URL: ${apiUrl} and max tokens: ${maxTokens}`);

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
        let model = tl.getInput('ai_model', true) as string; // Allow any string as the model name

        // Validate the model
        if (!this.supportedModels.includes(model)) {
            tl.warning(`The specified model "${model}" is not officially supported. Proceeding with caution.`);
        }

        if (this.doesMessageExceedTokenLimit(diff + this.systemMessage, this.maxTokens)) {
            tl.warning(`The diff for file ${fileName} exceeds the token limit of ${this.maxTokens}. Skipping review.`);
            return 'NO_COMMENT';
        }

        try {
            console.log('Request payload:', {
                messages: [
                    { role: 'system', content: this.systemMessage },
                    { role: 'user', content: diff }
                ],
                model: model
            });

            console.log(`Using API URL: ${this.apiUrl}`);

            let openAi = await this._openAi.chat.completions.create({
                messages: [
                    { role: 'system', content: this.systemMessage },
                    { role: 'user', content: diff }
                ],
                model: model
            });

            let response = openAi.choices;

            if (response.length > 0) {
                return response[0].message.content!;
            }
        } catch (error: any) {
            tl.error(`Error during API call: ${error.message}`);
            if (error.response) {
                console.error('API response:', error.response.data);
            }
            return 'NO_COMMENT';
        }

        tl.warning(`Unable to process diff for file ${fileName} as it exceeds token limits.`);
        return '';
    }

    private doesMessageExceedTokenLimit(message: string, tokenLimit: number): boolean {
        let tokens = encode(message);
        return tokens.length > tokenLimit;
    }
}
