import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// 1. AWS Provider Configuration - Use environment variables instead of profile
const awsProvider = new aws.Provider("aws-provider", {
  region: "us-east-1", // Remove profile for CI/CD usage
});

// 2. S3 Bucket with required security settings
const bucket = new aws.s3.Bucket("static-web-jabri-bucket", {
  website: {
    indexDocument: "index.html",
  },
  objectOwnership: "BucketOwnerEnforced", // Required security setting
}, { provider: awsProvider });

// 3. Bucket Policy for public access
const bucketPolicy = new aws.s3.BucketPolicy("bucket-policy", {
  bucket: bucket.id,
  policy: bucket.arn.apply(arn => JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Principal: "*",
      Action: ["s3:GetObject"],
      Resource: [`${arn}/*`]
    }]
  }))
}, { provider: awsProvider });

// 4. CloudFront Distribution (fixed origin configuration)
const distribution = new aws.cloudfront.Distribution("static-website-distribution", {
  enabled: true,
  origins: [{
    originId: pulumi.interpolate`s3-${bucket.id}`, // Fixed origin ID format
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
    targetOriginId: pulumi.interpolate`s3-${bucket.id}`,
    viewerProtocolPolicy: "redirect-to-https",
    allowedMethods: ["GET", "HEAD", "OPTIONS"],
    cachedMethods: ["GET", "HEAD", "OPTIONS"],
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
}, { provider: awsProvider });

// Export URLs
export const bucketUrl = bucket.websiteEndpoint;
export const distributionUrl = distribution.domainName;
export const distributionUrl = distribution.domainName;

