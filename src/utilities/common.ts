import {ask, confirm, fileExists, getFileJson, saveFileJson} from '@snickbit/node-utilities'
import {camelCase} from '@snickbit/utilities'
import {createClient} from '@urql/core'
import {default_icon_aliases, default_icons, icon_prefix_types} from './data'
import out, {Out} from '@snickbit/out'
import path from 'path'
import 'isomorphic-unfetch'

interface Config {
	version: 'svg-fontawesome-v5-pro' | 'svg-fontawesome-v6-pro'
	default: 'fad' | 'fal' | 'far' | 'fas'
	typescript: boolean
	isQuasar: boolean
	icons: string[]
	aliases: Record<string, string>
	output?: string
}

let _config: Config

export const $out = new Out('fa-cli')

export const client = createClient({url: 'https://api.fontawesome.com'})

export function getNodeModulesPath() {
	return path.join(process.cwd(), 'node_modules')
}

export const config_path = path.join(process.cwd(), 'fa.config.json')

export async function initConfig() {
	if (!_config) {
		if (!fileExists(config_path)) {
			// create with inquirer
			$out.block.info('fa-cli config')

			_config = {} as Config

			_config.version = await ask('Which FontAwesome version?', {
				type: 'select',
				choices: [
					{
						title: 'FontAwesome Pro 5',
						value: 'svg-fontawesome-v5-pro'
					},
					{
						title: 'FontAwesome Pro 6',
						value: 'svg-fontawesome-v6-pro'
					}
				]
			})

			if (!_config.version) {
				out.fatal('No FontAwesome version selected')
			}

			_config.default = await ask('Default Style?', {
				type: 'select',
				choices: [
					{
						title: 'Regular',
						value: 'far'
					},
					{
						title: 'Solid',
						value: 'fas'
					},
					{
						title: 'Light',
						value: 'fal'
					},
					{
						title: 'Duotone',
						value: 'fad'
					}
				]
			})

			if (!_config.default) {
				out.fatal('No default style selected')
			}

			if (fileExists('tsconfig.json') && await confirm('Use TypeScript?')) {
				_config.typescript = true
			}

			_config.icons = [...default_icons]
			_config.aliases = {...default_icon_aliases}
			if (fileExists('quasar.conf.js') || fileExists('quasar.config.js')) {
				$out.info('Quasar Framework detected!')
				_config.isQuasar = true
			}

			saveConfig(_config)
		} else {
			try {
				_config = getFileJson(config_path)
			} catch (error) {
				$out.error(`Error parsing config file: ${error.message}`)
				// eslint-disable-next-line unicorn/no-process-exit
				process.exit(1)
			}
		}
	}

	icon_prefix_types.fa = icon_prefix_types[_config.default]

	return _config
}

export function useConfig() {
	if (!_config) {
		out.throw('No config found!')
	}

	icon_prefix_types.fa = icon_prefix_types[_config.default]

	return _config
}

export function saveConfig(conf) {
	_config = conf
	return saveFileJson(config_path, _config)
}

export function iconExists(icon: string) {
	const config = useConfig()
	const iconName = cleanIconName(icon)
	const reg = new RegExp(`^fa[a-z]?:(${iconName})$`)
	return config.icons.find(i => reg.test(i))
}

export function cleanIconName(icon_name: string): string {
	return icon_name.replace(/(fa[a-z]?)[:-]/, '')
}

export function normalizeIconName(icon_name: string): string {
	icon_name = icon_name.replace(/(fa[a-z]?)[:-]/, `$1:`)
	if (!icon_name.includes(':')) {
		icon_name = `fa:${icon_name}`
	}
	return icon_name
}

export function parseIcon(raw_icon_name) {
	const config = useConfig()

	const normalizedIconName = normalizeIconName(raw_icon_name)
	// eslint-disable-next-line prefer-const
	let [prefix, name] = normalizedIconName.split(':')

	if (prefix === 'fa' && config.default) {
		prefix = config.default
	}

	const import_name = camelCase(`fa-${name}`)
	const prefixed_name = camelCase(`${prefix}-${name}`)
	const import_path = `@fortawesome/${icon_prefix_types[prefix] || icon_prefix_types['fa']}`

	return {
		id: normalizedIconName,
		prefix,
		name,
		import_name,
		prefixed_name,
		import_path
	}
}

export function getImportString(icon) {
	if (typeof icon === 'string') {
		icon = parseIcon(icon)
	}

	const import_name = icon.import_name === icon.prefixed_name ? icon.import_name : `${icon.import_name} as ${icon.prefixed_name}`
	return `import {${import_name}} from "${icon.import_path}/${icon.import_name}"`
}

export function getStringContent(content, config) {
	const iconAliases = {...default_icon_aliases, ...config.aliases}
	const aliases_string = `export const icon_aliases = ${JSON.stringify(iconAliases, null, 2)}`

	return config.isQuasar ? `
// required
import {boot} from 'quasar/wrappers'
import {useFa} from '@snickbit/fa-gen'
import {library} from "@fortawesome/fontawesome-svg-core"

${content.join('\n')}
${aliases_string}

/**
 * @param {Object} BootFileParams
 */
export default boot(async ({app}) => {
	await useFa(app, icon_aliases)
})
` : `
import {library} from "@fortawesome/fontawesome-svg-core"

${content.join('\n')}
${aliases_string}
`
}
