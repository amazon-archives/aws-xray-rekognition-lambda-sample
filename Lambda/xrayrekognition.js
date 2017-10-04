/*Copyright 2017-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License").
You may not use this file except in compliance with the License.
A copy of the License is located at http://aws.amazon.com/apache2.0/ or in the "license" file accompanying this file.
This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.*/

var AWSXRay = require("aws-xray-sdk-core");
var AWS = AWSXRay.captureAWS(require("aws-sdk"));

var s3 = new AWS.S3({ signatureVersion: "v4" });

AWS.config.apiVersions = {
    rekognition: '2016-06-27'
};

var cognitoidentity = new AWS.CognitoIdentity();
var rekognition = new AWS.Rekognition();

var results = "";

exports.handler = (event, context, callback) => {
    if (typeof context.identity !== "undefined") {
        console.log("Cognito identity ID =", context.identity.cognitoIdentityId);
        var cognitoparams = {
            IdentityId: context.identity.cognitoIdentityId /* required */
        };

        cognitoidentity.getCredentialsForIdentity(cognitoparams, function(err, data) {
            if (err) {
                console.log("Error getting cognito identity: " + err, err.stack);
            } else {
                console.log("Cognito Identity data.IdentityId: ", data.IdentityId);

                console.log("Cognito sessiontoken: ", data.Credentials.SessionToken);
            }
        });
    }

    console.log("Starting detectFaces in Rekognition");
    console.log("Received event:", JSON.stringify(event, null, 2));

    var srcBucket = event.srcBucket;
    var srcKey = event.srcKey;

    console.log("srcBucket: " + srcBucket);
    console.log("srcKey: " + srcKey);

    var imageName = "image:" + srcKey;
    var attachment = null;

    var paramsGet = {
        Bucket: srcBucket,
        Key: srcKey
    };

    AWSXRay.captureAsyncFunc("## recognizeCelebrities:" + imageName, function(subsegment) {
        subsegment.addAnnotation("Celebrityimages", imageName);

        console.log("Started s3.getObject on: " + srcKey);
        console.log("Got image:" + srcKey + " from S3");

        var paramsR = {
            Image: {
                S3Object: {
                    Bucket: srcBucket,
                    Name: srcKey
                }
            }
        };
        console.log("Starting recognizeCelebrities in Rekognition on bucket:" + srcBucket);
        console.log("recognizeCelebrities on image: " + srcKey);

        rekognition.recognizeCelebrities(paramsR, function(err, data) {
            if (err) {
                console.log(err, err.stack); // an error occurred
            } else {
                var CelebrityNames = "";
                var MatchConfidence = [];
                var sumOfAllConfidence = 0;
                var faceCount = 0;
                var pullResults = data;

                console.log(pullResults.CelebrityFaces);

                for (var key in pullResults.CelebrityFaces) {
                    if (pullResults.CelebrityFaces.hasOwnProperty(key)) {
                        if (key > 0) {
                            CelebrityNames += ", ";
                        }

                        CelebrityNames += pullResults.CelebrityFaces[key].Name;
                        MatchConfidence[MatchConfidence.length] = pullResults.CelebrityFaces[key].MatchConfidence;
                        sumOfAllConfidence += pullResults.CelebrityFaces[key].MatchConfidence;
                    }

                }

                var avgOfConfidence = (MatchConfidence.length > 0) ? sumOfAllConfidence / MatchConfidence.length : 0;
                var faceCount = (pullResults.CelebrityFaces.length + pullResults.UnrecognizedFaces.length);

                console.log("CelebrityNames: ", CelebrityNames);

                subsegment.addAnnotation("Celebritiesrecognized", CelebrityNames);
                subsegment.addAnnotation("Averageconfidence", avgOfConfidence);
                subsegment.addAnnotation("Facecount", faceCount);

                results = JSON.stringify(data, null, '\t');
                subsegment.addMetadata("xrayrekognition", pullResults);
                console.log(results);
            }
            subsegment.close();
            callback(null, data);
        });

        console.log("Completed recognizeCelebrities successfully in Rekognition");
    });
};
