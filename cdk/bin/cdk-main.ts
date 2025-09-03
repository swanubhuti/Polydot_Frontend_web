import * as cdk from 'aws-cdk-lib';
import { EksIamRoleStack } from '../lib/eks-iam-role';

const app = new cdk.App();
let context: any[] = app.node.tryGetContext("deploy");
const region: any[] = app.node.tryGetContext("region");

// This is used to specify targeted environment, used to target a specific environment
// To use, run cdk deploy/destroy --context environment="TARGET_DEPLOY_ENVIRONMENT"
// Example: cdk deploy --context environment=dev
const deployEnvironment: string = app.node.tryGetContext("environment");
if (deployEnvironment) context = context.filter(stage => stage.environment == deployEnvironment);

// This is a special override, used to target a specific region
// To use, run cdk deploy/destroy --context region="TARGET_AWS_REGION"
// Example: cdk destroy --context region=us-west-2
// If no region is provided, it defaults to ap-southeast-2
if (region) {
    context = context.filter(stage => stage.awsRegion == region)
} else {
    context = context.filter(stage => stage.awsRegion == "ap-southeast-2")
}

// Naming convention for construct ids
//     SERVICENAME-MASTER-AWSREGIONSHORTFORM
// Example: vpc-Master-apse2

context.forEach(stage => {

    new EksIamRoleStack(app, "easydairy-web-IAMRole-" + stage.environment + "-" + stage.awsRegionShortform, {
        environment: stage.environment,
        clusterName: stage.clusterName,
        oidcProviderArn: stage.oidcProviderArn,
        namespace: stage.namespace
    })

})