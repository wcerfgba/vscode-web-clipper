import * as Mercury from '@postlight/mercury-parser';
import TurndownService = require('turndown');
import { URL, URLSearchParams } from 'url';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	let clipWebPage = vscode.commands.registerCommand('webClipper.clipWebPage', async () => {
		// Prompt for a URL
		const url = await vscode.window.showInputBox({
			prompt: 'Enter a URL to clip',
			placeHolder: 'https://en.wikipedia.org/wiki/URL',
			validateInput: input => {
				try {
					new URL(input);
					return undefined;
				} catch (err) {
					return 'Input must be a valid URL (including the scheme and trailing slashes, such as https://)';
				}
			}
		});

		if (!url) return;

		clipPageAtUrl(url);
	});
	context.subscriptions.push(clipWebPage);

	let clipInline = vscode.commands.registerCommand('webClipper.clipInline', async () => {
		// Prompt for a URL
		const url = await vscode.window.showInputBox({
			prompt: 'Enter a URL to clip',
			placeHolder: 'https://en.wikipedia.org/wiki/URL',
			validateInput: input => {
				try {
					new URL(input);
					return undefined;
				} catch (err) {
					return 'Input must be a valid URL (including the scheme and trailing slashes, such as https://)';
				}
			}
		});

		if (!url) return;

		clipInlineAtUrl(url);
	});
	context.subscriptions.push(clipInline);

	vscode.window.registerUriHandler({
		handleUri: async uri => {
			if (uri.path === '/clip') {
				const params = new URLSearchParams(uri.query);
				if (params.has('url')) {
					clipPageAtUrl(params.get('url') as string);
				} else {
					vscode.window.showErrorMessage('Please provide a URL in the query string (ex. vscode://wcerfgba.web-clipper/clip?url=URL).');
				}
			}
		}
	});
}

export function deactivate() { }

async function clipPageAtUrl(url: string) {
	const configuration = vscode.workspace.getConfiguration();

	// Test if the URL is valid
	try {
		new URL(url);
	} catch (err) {
		vscode.window.showErrorMessage(`Invalid URL: ${url}`);
		return;
	}

	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: 'Clipping web page...'
	}, () => {
		return new Promise((resolve, reject) => {
			// Use Mercury to get the page and extract the main content
			Mercury.parse(url)
				.then(async (result: any) => {
					// Render article content to Markdown
					let markdown = new TurndownService(configuration.get('webClipper.turndownOptions'))
						.turndown(result.content);

					// Interpolate the results into the template string
					let output;
					try {
						output = eval('`' + configuration.get('webClipper.outputTemplate') + '`');
					} catch (err) {
						vscode.window.showErrorMessage(
							'The webClipper.outputTemplate string appears to be invalid.',
							'Open Settings'
						).then(item => {
							if (item === 'Open Settings') {
								vscode.commands.executeCommand('workbench.action.openSettingsJson');
							}
						});
						reject();
						return;
					}

					// Get rid of the progress notification
					resolve();

					// Create and show a new Markdown editor with the article
					const document = await vscode.workspace.openTextDocument({
						content: output,
						language: 'markdown'
					});

					await vscode.window.showTextDocument(document, {
						preview: false
					});

					// Open locked preview to the side automatically
					if (configuration.get('webClipper.autoShowPreviewToSide')) {
						vscode.commands.executeCommand('markdown.showLockedPreviewToSide');
					}
				})
				.catch((err: any) => {
					vscode.window.showErrorMessage('Error getting the page.');
					console.error(err);
					reject();
				});
		});
	});
}

async function clipInlineAtUrl(url: string) {
	const configuration = vscode.workspace.getConfiguration();

	// Test if the URL is valid
	try {
		new URL(url);
	} catch (err) {
		vscode.window.showErrorMessage(`Invalid URL: ${url}`);
		return;
	}

	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: 'Clipping web page inline...'
	}, () => {
		return new Promise((resolve, reject) => {
			// Use Mercury to get the page and extract the main content
			Mercury.parse(url)
				.then(async (result: any) => {
					// Render article content to Markdown
					let markdown = new TurndownService(configuration.get('webClipper.turndownOptions'))
						.turndown(result.content);

					// Interpolate the results into the template string
					let output : string;
					try {
						output = eval('`' + configuration.get('webClipper.inlineTemplate') + '`');
					} catch (err) {
						vscode.window.showErrorMessage(
							'The webClipper.inlineTemplate string appears to be invalid.',
							'Open Settings'
						).then(item => {
							if (item === 'Open Settings') {
								vscode.commands.executeCommand('workbench.action.openSettingsJson');
							}
						});
						reject();
						return;
					}

					// Get rid of the progress notification
					resolve();

					const editor = vscode.window.activeTextEditor;
					if (!editor) {
						throw new Error("No active editor!");
					}

					await editor.edit(editBuilder => {
						const position = editor.selection.active;
						editBuilder.insert(position, output)
					});
				})
				.catch((err: any) => {
					vscode.window.showErrorMessage('Error getting the page.');
					console.error(err);
					reject();
				});
		});
	});
}
