# Mention
Custom Salesforce Quill Mention

# Create a new package

First, need to define the default devhub username

`sfdx config:set defaultdevhubusername=bu`

Define the namespace in [/packaged/sfdx-project.json](/packaged/sfdx-project.json) file

Execute the createPackage.sh script with definition of package name and username of the user who should receive errors

`./createPackage.sh Mention bdovh@brave-unicorn-rgfwuq.com`
