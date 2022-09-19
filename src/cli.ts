#!/usr/bin/env node

import {cli} from '@snickbit/node-cli'
import {name, version} from '../package.json'
import * as actions from './actions'

cli()
	.name(name)
	.version(version)
	.actions(actions)
	.run()
