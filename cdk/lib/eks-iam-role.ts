import * as cdk from 'aws-cdk-lib';
import * as iam from "aws-cdk-lib/aws-iam";
import * as eks from "aws-cdk-lib/aws-eks";

interface EksIamRoleStackProps extends cdk.StackProps {
    environment: string,
    clusterName: string,
    oidcProviderArn: string,
    namespace: string
}

export class EksIamRoleStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: EksIamRoleStackProps) {
        super(scope, id, props);

        const provider = eks.OpenIdConnectProvider.fromOpenIdConnectProviderArn(this, 'OIDC_Provider', props.oidcProviderArn);

        const eksCluster = eks.Cluster.fromClusterAttributes(this, "EKS_Cluster_" + props.environment, {
            clusterName: props.clusterName,
            openIdConnectProvider: provider,
            kubectlRoleArn: "arn:aws:iam::593223115766:role/iam-Master-apse2-GithubActionsCICDforEKSRole2FB3AA0-O3vBmC21HUP1"
        })

        const serviceAccount = eksCluster.addServiceAccount("Service_Account_" + props.environment, {
            name: "easydairy-web-service-account",
            namespace: props.namespace
        })

        // For any permissions that the api pod should have, add to the role object as below
    
        const s3Permissions = {
            "Effect": "Allow",
            "Action": [
                "s3:Abort*",
                "s3:DeleteObject*",
                "s3:GetBucket*",
                "s3:GetObject*",
                "s3:List*",
                "s3:PutObject",
                "s3:PutObjectLegalHold",
                "s3:PutObjectRetention",
                "s3:PutObjectTagging",
                "s3:PutObjectVersionTagging"
            ],
            "Resource": [
                "arn:aws:s3:::easydairy-public",
                "arn:aws:s3:::easydairy-public/*"
            ]
        }

        // S3 permissions for uploading to public bucket
        serviceAccount.role.addToPrincipalPolicy(iam.PolicyStatement.fromJson(s3Permissions));
    }
}