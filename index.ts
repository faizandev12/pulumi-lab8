import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// Configure AWS provider with explicit settings
const awsProvider = new aws.Provider("aws-provider", {
  region: "us-east-1",
  version: "6.72.0" // Force provider version
});

// Create S3 bucket with modern security settings
const bucket = new aws.s3.Bucket("static-website-bucket", {
  website: {
    indexDocument: "index.html",
  },
  // Security-critical parameter for new AWS buckets
  objectOwnership: "BucketOwnerEnforced",
  
  // Remove all ACL references
}, { provider: awsProvider });

// Create bucket policy for public access
const bucketPolicy = new aws.s3.BucketPolicy("bucket-policy", {
  bucket: bucket.id,
  policy: {
    Version: "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Principal: "*",
      Action: ["s3:GetObject"],
      Resource: [pulumi.interpolate`${bucket.arn}/*`],
    }],
  },
}, { provider: awsProvider });

// CloudFront distribution configuration
const distribution = new aws.cloudfront.Distribution("website-cdn", {
  enabled: true,
  origins: [{
    originId: pulumi.interpolate`s3-${bucket.id}`,
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
  waitForDeployment: false,
}, { provider: awsProvider });

// Export URLs
export const bucketUrl = bucket.websiteEndpoint;
export const distributionUrl = distribution.domainName;

// Export URLs
export const bucketUrl = bucket.websiteEndpoint;
export const distributionUrl = distribution.domainName;
