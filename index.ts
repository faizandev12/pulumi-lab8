import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// First, ensure you're using @pulumi/aws >=5.0.0 in your package.json
const awsProvider = new aws.Provider("aws-provider", {
  region: "us-east-1",
});

const bucket = new aws.s3.Bucket("static-website-bucket", {
  website: {
    indexDocument: "index.html",
  },
  // CORRECT: Available in newer AWS provider versions
  objectOwnership: "BucketOwnerEnforced",
}, { provider: awsProvider });

// Bucket Policy remains the same
const bucketPolicy = new aws.s3.BucketPolicy("bucket-policy", {
  bucket: bucket.id,
  policy: bucket.arn.apply(arn => JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Principal: "*",
      Action: ["s3:GetObject"],
      Resource: [`${arn}/*`],
    }],
  })),
}, { provider: awsProvider });

// Upload index.html (no ACL needed)
const indexHtml = new aws.s3.BucketObject("index.html", {
  bucket: bucket.id,
  source: new pulumi.asset.FileAsset("index.html"),
  contentType: "text/html",
}, { provider: awsProvider });


// Create CloudFront distribution
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
  waitForDeployment: false, // Prevent CI/CD timeouts
}, { provider: awsProvider });

// Export URLs
export const websiteUrl = distribution.domainName;
export const s3BucketUrl = bucket.websiteEndpoint;

// Export URLs
export const bucketUrl = bucket.websiteEndpoint;
export const distributionUrl = distribution.domainName;
