const core = require('@actions/core');
const github = require('@actions/github');
const http = require('@actions/http-client');

async function run() {
  try {
    const pr = github.context.payload.pull_request;
    const taskReferenceRegex = /Notion Task: ([A-Za-z0-9]+)/;
    const match = pr.title.match(taskReferenceRegex);

    if (!match) {
      core.setFailed('PR title does not contain a valid Notion task reference.');
      return;
    }

    const taskId = match[1];
    const notionSecret = core.getInput('notion-secret');
    const httpClient = new http.HttpClient('GitHub Action');
    const response = await httpClient.get(`https://api.notion.com/v1/blocks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${notionSecret}`,
        'Notion-Version': '2021-05-13', // Adjust this version as needed
      },
    });

    if (response.message.statusCode !== 200) {
      core.setFailed('Notion task reference is not a valid issue.');

    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
