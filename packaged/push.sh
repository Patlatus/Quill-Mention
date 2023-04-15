./sdu.sh $1
sfdx force:source:deploy -p examples -w 500
./add.sh