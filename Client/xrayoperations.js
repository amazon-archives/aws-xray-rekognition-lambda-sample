/*Copyright 2017-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License").
You may not use this file except in compliance with the License.
A copy of the License is located at http://aws.amazon.com/apache2.0/ or in the "license" file accompanying this file.
This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.*/
var albumBucketName = 'imagestoragexray';
var resourceRegion = 'us-east-1'; //update this
var identityPoolId = 'us-east-1:e5190a73-7059-4f6f-8f78-1ce9657e9724'; //update this

AWS.config.update({
    region: resourceRegion,
    credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: identityPoolId
    })
});

var s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    params: { Bucket: albumBucketName }
});

var lambda = new AWS.Lambda({ region: resourceRegion, apiVersion: '2015-03-31' });

function viewAlbum(albumName) {
    var albumPhotosKey = encodeURIComponent(albumName) + '/';
    s3.listObjects({ Prefix: albumPhotosKey }, function(err, data) {
        if (err) {
            return alert('There was an error viewing your album: ' + err.message);
        }
        // `this` references the AWS.Response instance that represents the response
        var href = this.request.httpRequest.endpoint.href;
        var bucketUrl = href + albumBucketName + '/';

        var photos = data.Contents.map(function(photo) {
            var photoKey = photo.Key;
            var photoUrl = bucketUrl + encodeURIComponent(photoKey);
            var photoNameWithExt = photoKey.replace(albumPhotosKey, '');
            var photoNameWithoutExt = photoKey.replace(albumPhotosKey, '').replace(/\.[^/.]+$/, "");

            return getHtml([
                '<div class="gallery">',

                '<img style="width:300px;height:200px;" src="' + photoUrl + '"/>',

                '<div class="description">',
                '<button class="rc rcred" type="button" onclick="deletePhoto(\'' + albumName + "','" + photoKey + '\')">',
                'Delete Photo',
                '</button>',

                '<button class="rc" type="button" id="myreck-' + photoNameWithoutExt + '" onclick="recognizePhoto(\'' + photoNameWithoutExt + "','" + photoKey + '\')">',
                'Recognize faces',
                '</div>',
                '</div>',
                '</div>',
            ]);
        });

        var htmlTemplate = [
            '<h2>',
            'Album: ' + albumName,
            '</h2>',
            '<div>',
            getHtml(photos),
            '</div>',
            '<div>',
            '<input class="inputfile" id="photoupload" type="file" accept="image/*">',
            '<label for="photoupload">Choose a file</label>',
            '<button class="classybutton" id="addphoto" onclick="addPhoto(\'' + albumName + '\')">',
            'Add Photo',
            '</button>',
            '<input id="nameofceleb" name="nameofceleb" type="text" value="Steve Jobs">',
            '<button class="classybutton" id="buttonforcelebname" onclick="searchCeleb()">',
            'Search celeb',
            '</button>',
            '<input id="celebresult" type="text" value="Results will be displayed here" readonly="readonly">',
            '</div>',
        ]
        document.getElementById('app').innerHTML = getHtml(htmlTemplate);
    });
}

function addPhoto(albumName) {
    var files = document.getElementById('photoupload').files;
    if (!files.length) {
        return alert('Please choose a file to upload first.');
    }
    var file = files[0];
    var fileName = file.name;
    var albumPhotosKey = encodeURIComponent(albumName) + '/';

    var photoKey = albumPhotosKey + fileName;
    s3.upload({
        Key: photoKey,
        Body: file,
        ACL: 'public-read'
    }, function(err, data) {
        if (err) {
            console.log('There was an error uploading your photo: ' + err.message);
            return alert('There was an error uploading your photo: ', err.message);
        }

        alert('Successfully uploaded photo.');
        viewAlbum(albumName);
    });
}

function searchCeleb() {
    var celebName = $('#nameofceleb').val();
    alert("Celeb name to be searched: " + celebName);

    var pullParams = {
        FunctionName: 'xraysearchceleb',
        InvocationType: 'RequestResponse',
        LogType: 'None',
        Payload: '{"srcBucket" : "' + albumBucketName + '","searchCeleb" : "' + celebName + '"}'
    };

    lambda.invoke(pullParams, function(error, data) {
        if (error) {
            alert('Error on lambda invoke', error.stack);
        } else {
            console.log("data: ", data);
            pullResults = JSON.parse(data.Payload);
            console.log("CelebrityFaces: ", pullResults.length);

            var celebFaceCountString = "";
            for (var key in pullResults) {
                if (pullResults.hasOwnProperty(key)) {
                    var printResult = key + " is appearing: " + pullResults[key] + " times in all the photos";
                    console.log(printResult);

                    if (key == celebName) {
                        celebFaceCountString = printResult;
                        console.log("Celebrity Facecount: ", celebFaceCountString);
                    }
                }
            }
            celebFaceCountString = (celebFaceCountString.length > 0) ? celebFaceCountString : celebName + " was not found in your images";
            $('#celebresult').val(celebFaceCountString);
            console.log("Celebrity Facecount: ", celebFaceCountString);
        }
    });
}

function recognizePhoto(photoName, photoKey) {
    // create JSON object for parameters for invoking Lambda function
    var pullParams = {
        FunctionName: 'xrayrekognition',
        InvocationType: 'RequestResponse',
        LogType: 'None',
        Payload: '{ "srcBucket" : "' + albumBucketName + '","srcKey" : "' + photoKey + '"}'
    };

    // create variable to hold data returned by the Lambda function
    var pullResults = "";
    var CelebrityNames = "";

    lambda.invoke(pullParams, function(error, data) {
        if (error) {
            alert('Error on lambda invoke', error.stack);
        } else {
            console.log("data: ", data);
            pullResults = JSON.parse(data.Payload);

            for (var key in pullResults.CelebrityFaces) {
                if (pullResults.CelebrityFaces.hasOwnProperty(key)) {
                    if (key > 0) {
                        CelebrityNames += ", ";
                    }

                    CelebrityNames += pullResults.CelebrityFaces[key].Name;
                    console.log("CelebrityNames: ", CelebrityNames);
                }
            }
            $('#myreck-' + photoName + '').replaceWith("<h4>" + CelebrityNames + "</h4>");
            console.log("CelebrityNames: ", CelebrityNames);
        }
    });

}

function deletePhoto(albumName, photoKey) {
    s3.deleteObject({ Key: photoKey }, function(err, data) {
        if (err) {
            return alert('There was an error deleting your photo: ', err.message);
        }
        alert('Successfully deleted photo.');
        viewAlbum(albumName);
    });
}

function getHtml(template) {
    return template.join('\n');
}

viewAlbum("images");
