'use strict';

/* eslint-disable no-console */

const fetch = require('node-fetch');

const API = 'https://api.github.com';
const SINCE = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString();

console.log('fetching ECMA-262 commits since', SINCE);

fetch(`${API}/repos/tc39/ecma262/commits?since=${SINCE}`)
  .then((r) => r.json())
  .then((body) => {
    const commits = body.map((c) => `- [ ] [${c.commit.message.split('\n')[0]}](${c.html_url})`).join('\n');
    if (commits.length === 0) {
      return undefined;
    }

    const issue = {
      title: `Commits to ECMA-262 since ${SINCE}`,
      body: `(${process.env.TRAVIS_JOB_WEB_URL})\n\n${commits}`,
    };

    return fetch(`${API}/repos/devsnek/engine262/issues?access_token=${process.env.GH_TOKEN}`, {
      method: 'POST',
      body: JSON.stringify(issue),
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((r) => r.json())
      .then((b) => {
        console.log('Issue created!', b.html_url);
      });
  }).catch(console.error);

