const commandLineArgs = require("command-line-args");
const commandLineUsage = require("command-line-usage");
const startApp = require("./app");

const commandOptions = [
	{ name: 'config', alias: 'c', description: 'Subscription Configuration File', type: String, defaultOption: true},
	{ name: 'debug', alias: 'd', description: 'Debug', type: Boolean},
	{ name: 'help', alias: 'h', description: 'Display Help', type: Boolean}
];

const appOptions = commandLineArgs(commandOptions);

if(appOptions.help)
	displayHelp();
else
	startApp(appOptions);

function displayHelp() {
	const commandSections = [
		{
			header: 'Command Line Options',
			optionList: commandOptions
		}
	];

	console.log(commandLineUsage(commandSections));
}
