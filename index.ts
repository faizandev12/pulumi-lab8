import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// Initialize the AWS provider using the profile
const provider = new aws.Provider("aws", {
    profile: "jabri-devops-test-user", // Use your profile name here
    region: "us-east-1", // Specify your desired AWS region
});

// Create an S3 bucket
const bucket = new aws.s3.Bucket("static-web-jabri-bucket", {
    website: {
        indexDocument: "index.html",
    },
}, { provider });

// Upload a sample index.html
const bucketObject = new aws.s3.BucketObject("index.html", {
    bucket: bucket.id,
    source: new pulumi.asset.FileAsset("index.html"), // Make sure index.html is in your project folder
    contentType: "text/html",
}, { provider });

// Create CloudFront distribution
const distribution = new aws.cloudfront.Distribution("static-website-distribution", {
    enabled: true,
    origins: [{
        originId: bucket.arn,
        domainName: bucket.websiteEndpoint,
        customOriginConfig: {
            originProtocolPolicy: "http-only",
            httpPort: 80,
            httpsPort: 443,
            originSslProtocols: ["TLSv1.2"],
        },
    }],
    defaultRootObject: "index.html",
    defaultCacheBehavior: {
        targetOriginId: bucket.arn,
        viewerProtocolPolicy: "redirect-to-https",
        allowedMethods: ["GET", "HEAD"],
        cachedMethods: ["GET", "HEAD"],
        forwardedValues: {
            queryString: false,
            cookies: { forward: "none" },
        },
    },
    restrictions: {
        geoRestriction: {
            restrictionType: "none",
        },
    },
    viewerCertificate: {
        cloudfrontDefaultCertificate: true,
    },
}, { provider });

// Export URLs
export const bucketUrl = bucket.websiteEndpoint;
export const distributionUrl = distribution.domainName;

