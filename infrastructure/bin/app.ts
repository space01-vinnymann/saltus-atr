#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { SaltusAtrStack } from '../lib/saltus-atr-stack'

const app = new cdk.App()

new SaltusAtrStack(app, 'SaltusAtrStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'eu-west-2',
  },
})
