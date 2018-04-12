const html = require('choo/html')
const GitHubButton = require('./githubButton')

module.exports = footer

function footer (state) {
  const {glitchAppName, gitHubRepoName} = state
  return html`
    <footer>
      <a href="https://glitch.com/edit/#!/${glitchAppName}">
        <img src="https://cdn.glitch.com/2bdfb3f8-05ef-4035-a06e-2043962a3a13%2Fview-source%402x.png?1513093958802"
              alt="view source button" aria-label="view source" height="33">
      </a>
      <a href="https://glitch.com/edit/#!/remix/${glitchAppName}">
        <img src="https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg"
              alt="Remix on Glitch" />
      </a>
      ${state.cache(GitHubButton, 'gitHubButton', gitHubRepoName).render()}
    </footer>
  `
}


