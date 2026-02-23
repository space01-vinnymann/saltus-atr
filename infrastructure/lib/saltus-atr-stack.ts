import * as cdk from "aws-cdk-lib";
import * as amplify from "aws-cdk-lib/aws-amplify";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambdaBase from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as path from "path";
import { Construct } from "constructs";

export class SaltusAtrStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Deploy with: cdk deploy -c basicAuthPassword=yourpassword
    const allowedOrigin = this.node.tryGetContext("allowedOrigin") as
      | string
      | undefined;
    const basicAuthUsername =
      (this.node.tryGetContext("basicAuthUsername") as string) ?? "guestuser";
    const basicAuthPassword = this.node.tryGetContext("basicAuthPassword") as
      | string
      | undefined;
    if (!basicAuthPassword) {
      throw new Error(
        'CDK context "basicAuthPassword" is required. Deploy with: cdk deploy -c basicAuthPassword=yourpassword',
      );
    }

    const githubToken = this.node.tryGetContext("githubToken") as
      | string
      | undefined;
    if (!githubToken) {
      throw new Error(
        'CDK context "githubToken" is required. Deploy with: cdk deploy -c githubToken=ghp_xxx',
      );
    }

    // Cognito Identity Pool (unauthenticated access for anonymous users)
    const identityPool = new cognito.CfnIdentityPool(
      this,
      "SaltusATRIdentityPool",
      {
        identityPoolName: "SaltusATRIdentityPool",
        allowUnauthenticatedIdentities: true,
      },
    );

    // IAM role for unauthenticated users
    const unauthRole = new iam.Role(this, "CognitoUnauthRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "unauthenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity",
      ),
    });

    // Attach role to identity pool
    new cognito.CfnIdentityPoolRoleAttachment(this, "IdentityPoolRoles", {
      identityPoolId: identityPool.ref,
      roles: {
        unauthenticated: unauthRole.roleArn,
      },
    });

    // AppSync GraphQL API
    const api = new appsync.GraphqlApi(this, "SaltusATRApi", {
      name: "SaltusATRApi",
      definition: appsync.Definition.fromFile(
        path.join(__dirname, "schema.graphql"),
      ),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.IAM,
        },
      },
    });

    // Grant unauthenticated role permission to invoke AppSync
    api.grant(unauthRole, appsync.IamResource.all(), "appsync:GraphQL");

    // Lambda: getQuestions
    const getQuestionsLambda = new lambda.NodejsFunction(
      this,
      "GetQuestionsFunction",
      {
        functionName: "getQuestionsSaltusATR",
        entry: path.join(__dirname, "..", "lambda", "getQuestions", "index.ts"),
        handler: "handler",
        runtime: lambdaBase.Runtime.NODEJS_22_X,
        memorySize: 256,
        timeout: cdk.Duration.seconds(30),
        bundling: { minify: true, sourceMap: true },
      },
    );

    // Lambda: calculateRisk
    const calculateRiskLambda = new lambda.NodejsFunction(
      this,
      "CalculateRiskFunction",
      {
        functionName: "calculateRiskSaltusATR",
        entry: path.join(
          __dirname,
          "..",
          "lambda",
          "calculateRisk",
          "index.ts",
        ),
        handler: "handler",
        runtime: lambdaBase.Runtime.NODEJS_22_X,
        memorySize: 256,
        timeout: cdk.Duration.seconds(30),
        bundling: { minify: true, sourceMap: true },
      },
    );

    // AppSync data sources and resolvers
    const getQuestionsDs = api.addLambdaDataSource(
      "GetQuestionsDs",
      getQuestionsLambda,
    );
    getQuestionsDs.createResolver("GetQuestionsResolver", {
      typeName: "Query",
      fieldName: "getQuestions",
    });

    const calculateRiskDs = api.addLambdaDataSource(
      "CalculateRiskDs",
      calculateRiskLambda,
    );
    calculateRiskDs.createResolver("CalculateRiskResolver", {
      typeName: "Mutation",
      fieldName: "calculateRisk",
    });

    // Amplify Hosting — password-protected frontend with GitHub auto-deploy
    const amplifyApp = new amplify.CfnApp(this, "SaltusATRAmplifyApp", {
      name: "saltus-atr-questionnaire",
      repository: "https://github.com/space01-vinnymann/saltus-atr",
      oauthToken: githubToken,
      platform: "WEB",
      environmentVariables: [
        { name: "VITE_APPSYNC_ENDPOINT", value: api.graphqlUrl },
        { name: "VITE_APPSYNC_REGION", value: this.region },
        { name: "VITE_COGNITO_IDENTITY_POOL_ID", value: identityPool.ref },
        { name: "VITE_PARENT_ORIGIN", value: "" },
        { name: "_CUSTOM_IMAGE", value: "amplify:al2023" },
      ],
      basicAuthConfig: {
        enableBasicAuth: true,
        username: basicAuthUsername,
        password: basicAuthPassword,
      },
      customRules: [
        {
          source:
            "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>",
          target: "/index.html",
          status: "200",
        },
      ],
    });

    new amplify.CfnBranch(this, "SaltusATRMainBranch", {
      appId: amplifyApp.attrAppId,
      branchName: "main",
      enableAutoBuild: true,
      stage: "PRODUCTION",
      framework: "React",
    });

    // Amplify URL for S3 CORS — resolves at deploy time via CloudFormation
    const amplifyUrl = cdk.Fn.join("", [
      "https://main.",
      amplifyApp.attrDefaultDomain,
    ]);

    // S3 bucket for PDF storage
    const pdfBucket = new s3.Bucket(this, "SaltusATRPDFStore", {
      bucketName: `saltus-atr-pdf-store-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: [allowedOrigin ?? amplifyUrl, "http://localhost:*"],
          allowedHeaders: ["*"],
          maxAge: 3600,
        },
      ],
    });

    // Lambda: generatePDF
    // Chromium is bundled via @sparticuz/chromium (included in esbuild bundle)
    const generatePdfLambda = new lambda.NodejsFunction(
      this,
      "GeneratePdfFunction",
      {
        functionName: "generateRiskResultPDFSaltusATR",
        entry: path.join(__dirname, "..", "lambda", "generatePDF", "index.ts"),
        handler: "handler",
        runtime: lambdaBase.Runtime.NODEJS_22_X,
        memorySize: 2048,
        timeout: cdk.Duration.seconds(300),
        environment: {
          PDF_BUCKET_NAME: pdfBucket.bucketName,
        },
        bundling: {
          minify: true,
          sourceMap: true,
          // Exclude chromium binary from esbuild — it's loaded at runtime from the npm package
          nodeModules: ["@sparticuz/chromium"],
        },
      },
    );
    pdfBucket.grantReadWrite(generatePdfLambda);

    const generatePdfDs = api.addLambdaDataSource(
      "GeneratePdfDs",
      generatePdfLambda,
    );
    generatePdfDs.createResolver("GeneratePdfResolver", {
      typeName: "Mutation",
      fieldName: "generateRiskResultPDF",
    });

    // Outputs
    new cdk.CfnOutput(this, "AmplifyAppUrl", {
      value: amplifyUrl,
      description: "Amplify Hosting URL (password-protected)",
    });

    new cdk.CfnOutput(this, "AmplifyAppId", {
      value: amplifyApp.attrAppId,
      description: "Amplify App ID",
    });

    new cdk.CfnOutput(this, "AppSyncEndpoint", {
      value: api.graphqlUrl,
      description: "AppSync GraphQL endpoint URL",
    });

    new cdk.CfnOutput(this, "AppSyncRegion", {
      value: this.region,
      description: "AWS region",
    });

    new cdk.CfnOutput(this, "CognitoIdentityPoolId", {
      value: identityPool.ref,
      description: "Cognito Identity Pool ID",
    });

    new cdk.CfnOutput(this, "PDFBucketName", {
      value: pdfBucket.bucketName,
      description: "S3 bucket for PDF storage",
    });
  }
}
