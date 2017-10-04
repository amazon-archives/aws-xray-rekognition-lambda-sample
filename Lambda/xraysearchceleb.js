/*Copyright 2017-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License").
You may not use this file except in compliance with the License.
A copy of the License is located at http://aws.amazon.com/apache2.0/ or in the "license" file accompanying this file.
This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.*/

var async = require('async')
var AWSXRay = require("aws-xray-sdk-core");
var AWS = AWSXRay.captureAWS(require('aws-sdk'));

var s3 = new AWS.S3({signatureVersion: 'v4'});

AWS.config.apiVersions = {
  rekognition: '2016-06-27'
};

var cognitoidentity = new AWS.CognitoIdentity();
var rekognition = new AWS.Rekognition();

var results = "";

exports.handler = (event, context, callback) => {
	console.log('Calling xraysearchceleb');
	if (typeof context.identity !== 'undefined') {
        console.log('Cognito identity ID =', context.identity.cognitoIdentityId);
        var cognitoparams = {
  			IdentityId: context.identity.cognitoIdentityId /* required */
		};

		cognitoidentity.getCredentialsForIdentity(cognitoparams, function(err, data){
			if(err)
			{
				console.log("Error getting cognito identity: "+err,err.stack);
			}
			else
			{
				console.log('Cognito Identity data.IdentityId: ', data.IdentityId);

				console.log('Cognito sessiontoken: ', data.Credentials.SessionToken);
			}
    	});
    }

	console.log('Starting detectFaces in Rekognition');
	console.log('Received event:', JSON.stringify(event, null, 2));

	var srcBucket = event.srcBucket;
	var celebName = event.searchCeleb;
 	var paramsList = {Bucket: srcBucket};
 	var s3ObjectsCaptured = "";

	AWSXRay.captureAsyncFunc('S3',function(subsegment){

 		console.log("Started s3.listObjects on bucket: "+srcBucket);
 		s3.listObjects(paramsList,function(err,data){
 			if(err)
 			{
 				console.log(err,err.stack);
 				subsegment.close();
 			}
 			else
 			{
 				var CelebrityNamesAndFaceCount = {}; //["Bill Gates"=>25,"Steve Jobs"=>30,"Jeff Bezos"=>23]

 				s3ObjectsCaptured = data;

 				counter = 0;

 				async.times(data.Contents.length, function(n, next) {
				    var srcKey = data.Contents[n].Key;

				    callRekognition(srcBucket,srcKey,function(err,CelebrityNamesAndFaceCountReturned){
				        if(err){
	  						console.log(err, err.stack); // an error occurred
	  					}else{
	  						console.log("CelebrityNamesAndFaceCountReturned: ",CelebrityNamesAndFaceCountReturned);

	  						for (var celebNameAsKey in CelebrityNamesAndFaceCountReturned) {
							    if (CelebrityNamesAndFaceCountReturned.hasOwnProperty(celebNameAsKey)) {
							   		var previousFaceCount = (CelebrityNamesAndFaceCount.hasOwnProperty(celebNameAsKey)) ? CelebrityNamesAndFaceCount[celebNameAsKey] : 0;
							   		CelebrityNamesAndFaceCount[celebNameAsKey] = previousFaceCount + CelebrityNamesAndFaceCountReturned[celebNameAsKey];
							    }
							    console.log("CelebrityNamesAndFaceCount (inner2): ",CelebrityNamesAndFaceCount);
							}

							console.log("CelebrityNamesAndFaceCount (inner1): ",CelebrityNamesAndFaceCount);
	  					}

				        next(err, CelebrityNamesAndFaceCount);
				    });
				    ++n;
				}, function(err, AllCelebrityNamesAndFaceCounts) {
				    console.log("CelebrityNamesAndFaceCount (outside): ",AllCelebrityNamesAndFaceCounts);
				    subsegment.close();
				    callback(null,AllCelebrityNamesAndFaceCounts[0]);
				});
 			}
 		});

	});
};

function callRekognition(srcBucket,srcKey,callback){
	AWSXRay.captureAsyncFunc('## Running rekognition for: '+srcKey,function(subsegment1){
			subsegment1.addAnnotation("Celebrityimages", srcKey);
			var paramsR = {
			Image: {
				//Bytes: data.body,
				S3Object: {
					Bucket: srcBucket,
					Name: srcKey
					}
				}
			};
			rekognition.recognizeCelebrities(paramsR,function(err,data){
 			console.log("Running recognizeCelebrities image:"+srcKey+" from: "+srcBucket);

 			if (err)
   			{
   				console.log(err, err.stack); // an error occurred
   				callback(err,null)
   			}
   			else
   			{
   				var CelebrityNames="";
   				var MatchConfidence=[];
   				var sumOfAllConfidence=0;
   				var faceCount=0;
   				var pullResults = data;
   				var CelebrityNamesAndFaceCount1=[];

   				console.log(pullResults.CelebrityFaces);

   				for (var key in pullResults.CelebrityFaces) {
		            if (pullResults.CelebrityFaces.hasOwnProperty(key)) {
		                if(key > 0)
		                {
		                    CelebrityNames += ", ";
		                }

		                var CelebrityName = pullResults.CelebrityFaces[key].Name;

		                var counter = (CelebrityNamesAndFaceCount1.hasOwnProperty(CelebrityName)) ? CelebrityNamesAndFaceCount1[pullResults.CelebrityFaces[key].Name] : 1;
		                CelebrityNames += CelebrityName;
		                MatchConfidence[MatchConfidence.length] = pullResults.CelebrityFaces[key].MatchConfidence;
		                sumOfAllConfidence += pullResults.CelebrityFaces[key].MatchConfidence;
		                CelebrityNamesAndFaceCount1[pullResults.CelebrityFaces[key].Name] = counter++;
		            }

		          }

		        var avgOfConfidence = (MatchConfidence.length > 0) ? sumOfAllConfidence/MatchConfidence.length : 0;
		        var faceCount = (pullResults.CelebrityFaces.length+pullResults.UnrecognizedFaces.length);

		        console.log("CelebrityNames: ",CelebrityNames);
		        console.log("CelebrityNamesAndFaceCount1: ",CelebrityNamesAndFaceCount1);

		        subsegment1.addAnnotation("Celebritiesrecognized", CelebrityNames);
		        subsegment1.addAnnotation("Averageconfidence", avgOfConfidence);
		        subsegment1.addAnnotation("Facecount", faceCount);

   				results = JSON.stringify(data,null,'\t');
   				subsegment1.addMetadata("xrayrekognition",pullResults);
   				console.log(results);
   			}
   			subsegment1.close();
				callback(null,CelebrityNamesAndFaceCount1);
 		});
	 });
}
