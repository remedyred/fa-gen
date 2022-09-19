import {IconDefinition, IconName, IconPrefix} from '@fortawesome/fontawesome-common-types'
import {icon, IconLookup, library} from '@fortawesome/fontawesome-svg-core'
import {default_icon_map} from './utilities/data'
import {isString} from '@snickbit/utilities'
import out from '@snickbit/out'

export type faIconPrefix = IconPrefix | 'fa'

export interface Library {
	definitions?: Record<string, IconDefinition>
}

export type IconSplit = [faIconPrefix, IconName]

export type IconString = `${faIconPrefix}:${IconName}`

export function parseIcon(iconData) {
	let [
		// eslint-disable-next-line prefer-const
		width,
		// eslint-disable-next-line prefer-const
		height,
		ligatures,
		,
		svgPathData
	] = iconData.icon

	if (ligatures.length < 2 || iconData.prefix !== 'fad') {
		ligatures = [0, 0]
	}
	if (Array.isArray(svgPathData)) {
		for (const svgIndex of svgPathData.keys()) {
			let svgPath = svgPathData[svgIndex]

			if (isString(svgPath) && !svgPath.includes('@@fill: var')) {
				if (svgIndex === 0) {
					svgPath += '@@fill: var(--fa-secondary-color, currentColor);opacity: 0.4;opacity: var(--fa-secondary-opacity, 0.4);'
				} else if (svgIndex === 1) {
					svgPath += '@@fill: var(--fa-primary-color, currentColor);opacity: 1;opacity: var(--fa-primary-opacity, 1);'
				}
			}

			svgPathData[svgIndex] = svgPath
		}
		svgPathData = svgPathData.join('&&')
	}

	return `${svgPathData}|${ligatures.join(' ')} ${width} ${height}`
}

export async function useFa(app, icon_aliases): Promise<void> {
	out.verbose('Loading Font Awesome icons...')

	const definitions = (library as unknown as Library)?.definitions || {}

	const iconDefaultPrefixes = {}
	for (const [prefixName, prefixGroup] of Object.entries(definitions)) {
		for (const prefixIconName in prefixGroup) {
			(iconDefaultPrefixes[prefixIconName] = iconDefaultPrefixes[prefixIconName] || []).push(prefixName)
		}
	}

	function splitIconName(icon_name: string): IconSplit {
		let prefix: faIconPrefix = 'fa'
		if (icon_name.includes(':')) {
			[prefix, icon_name] = icon_name.split(':') as IconSplit
		}

		let prefixed_icon_name = `${prefix}:${icon_name}`
		if (icon_name in icon_aliases) {
			prefixed_icon_name = icon_aliases[icon_name]
		} else if (prefixed_icon_name in icon_aliases) {
			prefixed_icon_name = icon_aliases[prefixed_icon_name]
		}

		return prefixed_icon_name.includes(':') ? prefixed_icon_name.split(':') as IconSplit : [prefix, prefixed_icon_name] as IconSplit
	}

	function parseIconName(raw_icon_name: string): IconLookup {
		// eslint-disable-next-line prefer-const
		let [prefix, iconName] = splitIconName(raw_icon_name)

		if (prefix === 'fa' && iconName in iconDefaultPrefixes && iconDefaultPrefixes[iconName].length === 1) {
			prefix = [...iconDefaultPrefixes[iconName]].pop()
		}

		prefix = prefix as IconPrefix

		return {
			iconName,
			prefix
		}
	}

	app.config.globalProperties.$q.iconSet.set(default_icon_map)

	app.config.globalProperties.$q.iconMapFn = icon_name => {
		const parsedIconName = parseIconName(icon_name)
		const foundIcon = icon(parsedIconName)
		if (foundIcon) {
			return {
				cls: 'svg-inline--fa',
				icon: parseIcon(foundIcon)
			}
		}
	}
}
