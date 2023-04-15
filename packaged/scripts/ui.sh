previousPackageVersionName=$1
previousPackageVersionNumber=$2
previousPackageVersion=$3
description=$4
org=$5
suf=$6
previousResult=""
echo "1=$1 2=$2 3=$3 4=$4 5=$5 6=$6 7=$7"
echo "ui.sh: previousPackageVersionName: $previousPackageVersionName"
echo "ui.sh: previousPackageVersionNumber: $previousPackageVersionNumber"
echo "ui.sh: previousPackageVersion: $previousPackageVersion"
counter=0
while [ $counter -le 10 ]
do
    echo "Uninstalling $previousPackageVersion: sfdx force:package:uninstall -p $previousPackageVersion --json "
    echo $(sfdx force:package:uninstall -p $previousPackageVersion --json) > uninstall.txt
    echo $(cat uninstall.txt)
    v=$(cat uninstall.txt | tr '\n' ' ' | jq '.status')
    s=$(cat uninstall.txt | tr '\n' ' ' | jq '.result.Status')
    echo "status=$v"
    echo "Result.Status=$s"
    if [[ $v != 0 ]] 
    then 
        echo "Uninstall failed"
        m=$(cat uninstall.txt | tr '\n' ' ' | jq '.message' -r)
        echo "Error message: $m"
        echo "false" > result.txt
        
        previousResult="$previousResult Uninstall Failed for the previous $description version $previousPackageVersionNumber ($previousPackageVersionName) with subscriber install id $previousPackageVersion from $suf sandbox ($org) with errors $m"

        sub='Component is in use by another component in your organization'
        if [[ "$m" == *"$sub"* ]]; then
            echo "Dependency detected 1"
            echo "./scripts/rr.sh $7 $m"
            ((counter++))
            ./scripts/rr.sh "$7" "$m"
        else
            echo $previousResult > previousResult.txt
            break
        fi
    else
        while [[ ($v == 0) && ($s == '"InProgress"') ]]
        do 
            sleep 10
            v=$(sfdx force:package:uninstall:report -i $(cat uninstall.txt | tr '\n' ' ' | jq '.result.Id' -r) --json | jq '.status')
            s=$(sfdx force:package:uninstall:report -i $(cat uninstall.txt | tr '\n' ' ' | jq '.result.Id' -r) --json | jq '.result.Status')
            echo "status=$v"
            echo "Result.Status=$s"
        done
        if [[ ($v == 0) && ($s == '"Success"')]] 
        then 
            echo "Uninstalled successfully"
            echo "true" > result.txt
            previousResult="Previous $description version $previousPackageVersionNumber ($previousPackageVersionName) with subscriber install id $previousPackageVersion was uninstalled from $suf sandbox ($org)"
            echo $previousResult > previousResult.txt
            break
        fi
        if [[ $v != 0 ]] 
        then 
            echo "Uninstall failed"
            m=$(sfdx force:package:uninstall:report -i $(cat uninstall.txt | tr '\n' ' ' | jq '.result.Id' -r) --json | jq '.message' -r)
            echo "false" > result.txt
            previousResult="Uninstall Failed for the previous $description version $previousPackageVersionNumber ($previousPackageVersionName) with subscriber install id $previousPackageVersion from $suf sandbox ($org) with errors $m"

            sub='Component is in use by another component in your organization'
            if [[ "$m" == *"$sub"* ]]; then
                echo "Dependency detected 2"
                echo "./scripts/rr.sh $7 $m "  
                ((counter++))           
                ./scripts/rr.sh "$7" "$m"
            else
                echo $previousResult > previousResult.txt
                break
            fi
        fi
    fi
done