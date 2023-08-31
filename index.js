const core = require('@actions/core');
const github = require('@actions/github');
const { Client } = require('@notionhq/client');

async function run() {
  try {
    const pr = github.context.payload.pull_request;
    const taskReferenceRegex = /Notion Task: ([A-Za-z0-9]+)/;
    console.log(github.context.payload)
    const match = pr.title.match(taskReferenceRegex);

    if (!match) {
      core.setFailed('PR title does not contain a valid Notion task reference.');
      return;
    }

    const taskId = match[1];
    const notion = new Client({ auth: core.getInput('notion-secret') });

    try {
      const response = await notion.databases.query({
        database_id: core.getInput('task-database'),
        filter: {
          property: 'Task ID', // Replace with the actual property name
          text: {
            equals: taskId,
          },
        },
      });

      if (!response.results.length) {
        core.setFailed('Notion task reference is not a valid issue.');
      }
    } catch (error) {
      core.setFailed('Error querying Notion database: ' + error.message);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
