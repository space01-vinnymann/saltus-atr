import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as appsync from 'aws-cdk-lib/aws-appsync'
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs'
import * as path from 'path'
import { Construct } from 'constructs'
import { Runtime } from 'aws-cdk-lib/aws-lambda'

export class SaltusAtrStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // S3 bucket for PDF storage
    const pdfBucket = new s3.Bucket(this, 'SaltusATRPDFStore', {
      bucketName: `saltus-atr-pdf-store-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    // Cognito Identity Pool (unauthenticated access for anonymous users)
    const identityPool = new cognito.CfnIdentityPool(this, 'SaltusATRIdentityPool', {
      identityPoolName: 'SaltusATRIdentityPool',
      allowUnauthenticatedIdentities: true,
    })

    // IAM role for unauthenticated users
    const unauthRole = new iam.Role(this, 'CognitoUnauthRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'unauthenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    })

    // Attach role to identity pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoles', {
      identityPoolId: identityPool.ref,
      roles: {
        unauthenticated: unauthRole.roleArn,
      },
    })

    // AppSync GraphQL API
    const api = new appsync.GraphqlApi(this, 'SaltusATRApi', {
      name: 'SaltusATRApi',
      definition: appsync.Definition.fromFile(
        path.join(__dirname, 'schema.graphql'),
      ),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.IAM,
        },
      },
    })

    // Grant unauthenticated role permission to invoke AppSync
    api.grant(unauthRole, appsync.IamResource.all(), 'appsync:GraphQL')

    // Lambda: getQuestions
    const getQuestionsLambda = new lambda.NodejsFunction(this, 'GetQuestionsFunction', {
      functionName: 'getQuestionsSaltusATR',
      entry: path.join(__dirname, '..', 'lambda', 'getQuestions', 'index.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_22_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      bundling: { minify: true, sourceMap: true },
    })

    // Lambda: calculateRisk
    const calculateRiskLambda = new lambda.NodejsFunction(this, 'CalculateRiskFunction', {
      functionName: 'calculateRiskSaltusATR',
      entry: path.join(__dirname, '..', 'lambda', 'calculateRisk', 'index.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_22_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      bundling: { minify: true, sourceMap: true },
    })

    // AppSync data sources and resolvers
    const getQuestionsDs = api.addLambdaDataSource('GetQuestionsDs', getQuestionsLambda)
    getQuestionsDs.createResolver('GetQuestionsResolver', {
      typeName: 'Query',
      fieldName: 'getQuestions',
    })

    const calculateRiskDs = api.addLambdaDataSource('CalculateRiskDs', calculateRiskLambda)
    calculateRiskDs.createResolver('CalculateRiskResolver', {
      typeName: 'Mutation',
      fieldName: 'calculateRisk',
    })

    // Outputs for frontend .env
    new cdk.CfnOutput(this, 'AppSyncEndpoint', {
      value: api.graphqlUrl,
      description: 'AppSync GraphQL endpoint URL',
    })

    new cdk.CfnOutput(this, 'AppSyncRegion', {
      value: this.region,
      description: 'AWS region',
    })

    new cdk.CfnOutput(this, 'CognitoIdentityPoolId', {
      value: identityPool.ref,
      description: 'Cognito Identity Pool ID',
    })

    // Export bucket for use by PDF Lambda (added in Task 5)
    new cdk.CfnOutput(this, 'PDFBucketName', {
      value: pdfBucket.bucketName,
      description: 'S3 bucket for PDF storage',
    })
  }
}
