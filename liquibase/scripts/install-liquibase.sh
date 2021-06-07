#!/bin/bash -e

pushd ./liquibase/lib/ > /dev/null

echo "Remove existing files and folders"
rm -rf ./liquibase-4.3.5/
rm -f ./mysql-connector-java-8.0.24.jar

echo "Downloading liquibase V4.3.5 from Half Serious public S3 Bucket"

curl --silent https://yadu-public.s3.ca-central-1.amazonaws.com/liquibase-4.3.5.zip -o ./liquibase-4.3.5.zip
unzip -q -o liquibase-4.3.5.zi
rm -rf liquibase-4.3.5.zip

echo "Downloading MySQL Connector V8.0.24 from Half Serious public S3 Bucket"

curl --silent https://yadu-public.s3.ca-central-1.amazonaws.com/mysql-connector-java-8.0.24.jar -o ./mysql-connector-java-8.0.24.jar

popd > /dev/null
