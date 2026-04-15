import tl = require('azure-pipelines-task-lib/task');
import { HttpsProxyAgent } from 'https-proxy-agent';
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { ChatGPT } from './chatgpt';
import { AnthropicReviewer } from './anthropic';
import { PullRequest } from './pullrequest';
import { Repository } from './repository';

interface ICodeReviewer {
    PerformCodeReview(diff: string, fileName: string): Promise<string>;
}

export class Main {
    private static _reviewer: ICodeReviewer;
    private static _repository: Repository;
    private static _pullRequest: PullRequest;

    public static async Main(): Promise<void> {
        if (tl.getVariable('Build.Reason') !== 'PullRequest') {
            tl.setResult(tl.TaskResult.Skipped, "This task must only be used when triggered by a Pull Request.");
            return;
        }

        if (!tl.getVariable('System.AccessToken')) {
            tl.setResult(tl.TaskResult.Failed, "'Allow Scripts to Access OAuth Token' must be enabled. See https://learn.microsoft.com/en-us/azure/devops/pipelines/build/options?view=azure-devops#allow-scripts-to-access-the-oauth-token for more information");
            return;
        }

        const aiProvider = tl.getInput('ai_provider', true)!;
        const apiKey = tl.getInput('api_key', true)!;
        const fileExtensions = tl.getInput('file_extensions', false);
        const filesToExclude = tl.getInput('file_excludes', false);
        const additionalPrompts = tl.getInput('additional_prompts', false)?.split(',') ?? [];
        const customApiUrl = tl.getInput('api_url', false) || '';
        const maxTokens = parseInt(tl.getInput('max_tokens', false) || '4096', 10);
        const systemPromptOverride = tl.getInput('system_prompt', false) || undefined;

        const bugs = tl.getBoolInput('bugs', true);
        const performance = tl.getBoolInput('performance', true);
        const bestPractices = tl.getBoolInput('best_practices', true);

        let proxyUrl = tl.getVariable('Agent.ProxyUrl');

        if (aiProvider === 'anthropic') {
            const anthropicClient = new Anthropic({
                apiKey: apiKey,
                baseURL: customApiUrl || undefined,
                httpAgent: proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined
            });

            this._reviewer = new AnthropicReviewer(
                anthropicClient,
                bugs,
                performance,
                bestPractices,
                additionalPrompts,
                maxTokens,
                systemPromptOverride
            );
        } else {
            const openAiClient = new OpenAI({
                apiKey: apiKey,
                baseURL: customApiUrl || 'https://api.openai.com/v1',
                httpAgent: proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined
            });

            this._reviewer = new ChatGPT(
                openAiClient,
                bugs,
                performance,
                bestPractices,
                additionalPrompts,
                customApiUrl || 'https://api.openai.com/v1',
                maxTokens,
                systemPromptOverride
            );
        }

        this._repository = new Repository();
        this._pullRequest = new PullRequest();

        await this._pullRequest.DeleteComments();

        let filesToReview = await this._repository.GetChangedFiles(fileExtensions, filesToExclude);

        tl.setProgress(0, 'Performing Code Review');

        for (let index = 0; index < filesToReview.length; index++) {
            const fileToReview = filesToReview[index];
            let diff = await this._repository.GetDiff(fileToReview);
            let review = await this._reviewer.PerformCodeReview(diff, fileToReview);

            if (review.indexOf('NO_COMMENT') < 0) {
                await this._pullRequest.AddComment(fileToReview, review);
            }

            console.info(`Completed review of file ${fileToReview}`);

            tl.setProgress((fileToReview.length / 100) * index, 'Performing Code Review');
        }

        tl.setResult(tl.TaskResult.Succeeded, "Pull Request reviewed.");
    }
}

Main.Main();
