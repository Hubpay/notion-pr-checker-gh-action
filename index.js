const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require('@octokit/action');
const {Client} = require('@notionhq/client');

const taskReferenceRegex = /\b([A-Z]+-\d+)\b/g;

async function run() {
    try {

        const octokit = new Octokit();
        const match = (await getPullRequestTitle(octokit)).match(taskReferenceRegex);

        if (!match) {
            core.setFailed('PR title does not contain a valid Notion task reference.');
            return;
        }

        const taskId = match[0];
        const notion = new Client({auth: core.getInput('notion-secret', {required: true})});

        try {
            const taskNumber = parseInt(taskId.split('-')[1]);
            const databaseId = core.getInput('notion-database', {required: true});
            core.debug(`Searching for: ${taskNumber} in database: ${databaseId}`);
            const response = await notion.databases.query({
                database_id: databaseId,
                filter: {
                    property: 'Task ID', // Replace with the actual property name
                    number: {
                        equals: taskNumber,
                    },
                },
            });
            core.debug(`Results ${JSON.stringify(response)}`);
            if (!response.results.length) {
                core.setFailed('Notion task reference is not a valid issue.');
            }

            await octokit.issues.createComment({
                ...github.context.repo,
                issue_number: github.context.payload.pull_request.number,
                body: `Found Notion issue ${taskId}`
            });

        } catch (error) {
            core.setFailed('Error querying Notion database: ' + error.message);
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

async function getPullRequestTitle(octokit) {


    const owner = github.context.payload.pull_request.base.user.login;
    const repo = github.context.payload.pull_request.base.repo.name;

    const eventName = github.context.eventName;
    core.debug(`Event name: ${eventName}`);
    if ('pull_request' !== eventName) {
        core.setFailed(`Invalid event: ${eventName}`);
        return;
    }

    const {data: pullRequest} = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: github.context.payload.pull_request.number
    });

    core.debug(`Pull request title: ${pullRequest.title}`);
    return pullRequest.title;
}

run();
