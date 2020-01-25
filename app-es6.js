import {app, dialog, nativeImage, shell, Tray, Menu, BrowserWindow} from "electron";
import fs from "fs";
import path from "path";
import CacheQuoteSubscriptions from "./src/CacheQuoteSubscriptions";
import SubscriptionsVizOutput from "./src/SubscriptionsVizOutput";

export default (appOptions) => {
	app.on('window-all-closed', e => e.preventDefault() ); // prevent app from quitting when log window closes

	app.once('ready', () => {
		let debugWindow;
		let debugEvents = [];
		const options = {
			debug: debug
		};

		const execPath = process.env.hasOwnProperty('PORTABLE_EXECUTABLE_DIR') ? process.env.PORTABLE_EXECUTABLE_DIR : app.getAppPath();
		const assetsPath = app.isPackaged ? process.resourcesPath : path.join(execPath, "assets");

		Object.apply(appOptions, {
			execPath: execPath,
			assetsPath: assetsPath
		});

		// GET CONFIG FILE
		const configFileNames = appOptions.hasOwnProperty('config') ?
			[appOptions.config] :
			dialog.showOpenDialogSync({
				title: "Open Configuration",
				message: "Open Configuration",
				openFile: true,
				filters: [
					{ name: 'JSON Config', extensions: ['json'] }
				]
			});

		if(!Array.isArray(configFileNames) || configFileNames.length === 0) {
			app.quit();
			return;
		}

		const configFileName = path.isAbsolute(configFileNames[0]) ? configFileNames[0] : path.join(execPath, configFileNames[0]);
		if (!fs.existsSync(configFileName)) {
			dialog.showErrorBox("Missing Configuration File", `"${configFileName}" not found.`);
			app.quit();
			return;
		}

		let config;

		try {
			// PARSE CONFIG
			config = JSON.parse(fs.readFileSync(configFileName));

			if(!config.hasOwnProperty('serverURL')) {
				dialog.showErrorBox("Missing serverURL property in Configuration File", `"${configFileName}".`);
				app.quit();
				return;
			}

			if(!config.hasOwnProperty('subscriptions')) {
				dialog.showErrorBox("Missing subscriptions in Configuration File", `"${configFileName}".`);
				app.quit();
				return;
			}
		}
		catch (error) {
			dialog.showErrorBox("Configuration File Parse Error", `"${configFileName}" could not be parsed.`);
			app.quit();
			return;
		}

		if(!config.hasOwnProperty('debug') || config.debug)
			openDebugWindow();

		const cacheQuoteSubscriptions = new CacheQuoteSubscriptions(config.serverURL, config.subscriptions, Object.assign({defaultCollectionID: config.defaultCollectionID}, options));


		// VIZ OUTPUT
		if(config.hasOwnProperty('vizOutput')) {
			const vizOutputConfigs = Array.isArray(config.vizOutput) ? config.vizOutput : [config.vizOutput];

			for(let vizOutputConfig of vizOutputConfigs) {
				new SubscriptionsVizOutput(cacheQuoteSubscriptions, vizOutputConfig, options);
			}
		}

		// SET UP TRAY
		const trayImage = nativeImage.createFromPath(path.join(assetsPath, 'icon.png'));
		const tray = new Tray(trayImage);

		const contextMenu = Menu.buildFromTemplate([
			{label: 'Open Log', click: openDebugWindow},
			{label: 'Open Config File', click: () => {
					shell.openItem(configFileName);
				}},
			{type: 'separator'},
			{label: 'Quit', click: () => {
					const buttonPressed = dialog.showMessageBoxSync({
						message: 'Are you sure you want to quit?',
						buttons: ['Quit', 'Cancel']
					});

					if(buttonPressed === 0)
						app.quit()
				}}
		]);

		tray.setToolTip('Quote Cache Bridge');
		tray.setContextMenu(contextMenu);

		// SET UP TRAY STATUS ICONS
		cacheQuoteSubscriptions.on('connected', () => {
			const trayImage = nativeImage.createFromPath(path.join(assetsPath, 'icon-green.png'));
			tray.setImage(trayImage);
		});

		cacheQuoteSubscriptions.on('reconnected', () => {
			const trayImage = nativeImage.createFromPath(path.join(assetsPath, 'icon-green.png'));
			tray.setImage(trayImage);
		});

		cacheQuoteSubscriptions.on('disconnected', () => {
			const trayImage = nativeImage.createFromPath(path.join(assetsPath, 'icon-red.png'));
			tray.setImage(trayImage);
		});

		async function openDebugWindow() {
			if(!(debugWindow instanceof BrowserWindow)) {
				// SET UP LOG
				debugWindow = new BrowserWindow({
					width: 1000,
					height: 600,
					webPreferences: {
						nodeIntegration: true
					}
				});

				debugWindow.on('closed', () => {
					debugWindow = null
				});

				debugWindow.removeMenu();

				await debugWindow.loadURL(`file://${__dirname}/src/LoggingWindow.html`);

				for(let debugEvent of debugEvents) {
					debugWindow.webContents.send('debug-data', debugEvent);
				}
			}
			else
				debugWindow.show();
		}

		function debug() {
			const debugParts = [(new Date()).toISOString()].concat(Array.prototype.slice.call(arguments));
			if(appOptions.debug)
				console.log.apply(console, debugParts);

			const debugString = debugParts.join(' ');
			debugEvents.push(debugString);
			if(debugEvents.length > 1000)
				debugEvents.shift();

			if(debugWindow instanceof BrowserWindow)
				debugWindow.webContents.send('debug-data', debugString);
		}
	});
}
