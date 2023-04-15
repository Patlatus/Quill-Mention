# Mention
Custom Salesforce Quill Mention. 
## First initialization of repository

Add secrets like

 - SLACK_BOT_OAUTH
 - SLACK_CHANNEL
 - REPO_BEARER_TOKEN
 - SF_ORG_PACKAGING_DH
 - SF_ORG_QA
 - SF_ORG_REG
 - SF_ORG_DEV
 - SECONDARY_DEVHUB
 - SF_ORG_BU_DH
 
 Slack secrets are needed to send notification messages into the slack channel.
 
 Repo bearer token is needed to check if repo is alive and if there were any recent commits
 
 `SF_ORG_PACKAGING_DH` is needed to create second generation package and package versions.
 
 `SF_ORG_QA` is needed to reinstall most recent beta version in the night.
 
 `SF_ORG_REG` is needed to upgrade the most recent released version after release.
 
 `SF_ORG_DEV` is needed to reinstall every beta package version as soon as it is created after every merge to `dev` branch.
 
 `SECONDARY_DEVHUB` and `SF_ORG_BU_DH` are needed to create scratch orgs to validate pull requests.
 
 Also create and push a `dev` branch and make it protected.
