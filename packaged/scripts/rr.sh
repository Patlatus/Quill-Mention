default=$(sfdx config:get defaultusername | awk '/^==|^──|^Name/ {next}{print $2}')
sfdx config:set defaultusername=$1
namespace=$(cat ../packaged/sfdx-project.json | jq '.namespace' -r)
x=$2
echo $x
echo $x | sed 's/: /:/g'| sed 's/, /,/g'   | sed -E 's/[^"{}:,]+/"&"/g' | sed 's/},{/}\n{/g' | while IFS=\n read -r each; do
    compId=$(echo $each | jq '.componentId' -r)
    echo $compId
    #echo "Each: $each"
    #echo [[ $each == 0Rb* ]]
    if [[ $compId == 00N* ]]; then
        component=$(echo $each | jq '.componentName' -r)
        reference=$(echo $each | jq '.referenceName' -r)
        #component=$(echo $each | awk -v FS="(componentName: |,|referenceName: |,)" '{print $3}')
        #reference=$(echo $each | awk -v FS="(componentName: |,|referenceName: |,)" '{print $6}')
        echo "component: $component"
        echo "reference: $reference"
        sfdx force:source:retrieve -m "FlexiPage:$reference"

        
        #ßawk -v name="$namespace" -v comp="$component" 'NR==FNR{if ($0 ~ ("<componentName>"name":"comp"</componentName>")) for (i=-2;i<=2;i++) del[NR+i]; next} !(FNR in del)' file  "force-app/main/default/flexipages/${reference}.flexipage-meta.xml" > "copy.xml"
        awk -v name="$namespace" -v comp="$component" 'NR==FNR{if ($0 ~ (comp)) for (i=-2;i<=4;i++) del[NR+i]; next} !(FNR in del)' "force-app/main/default/flexipages/${reference}.flexipage-meta.xml" "force-app/main/default/flexipages/${reference}.flexipage-meta.xml" > "copy$component.xml"
        mv "copy$component.xml" "force-app/main/default/flexipages/$reference.flexipage-meta.xml"
        sfdx force:source:deploy -m "FlexiPage:$reference"
    fi
    if [[ $compId == 0Rb* ]]; then
        component=$(echo $each | jq '.componentName' -r)
        reference=$(echo $each | jq '.referenceName' -r)
        #component=$(echo $each | awk -v FS="(componentName: |,|referenceName: |,)" '{print $3}')
        #reference=$(echo $each | awk -v FS="(componentName: |,|referenceName: |,)" '{print $6}')
        echo "component: $component"
        echo "reference: $reference"
        sfdx force:source:retrieve -m "FlexiPage:$reference"

        
        #ßawk -v name="$namespace" -v comp="$component" 'NR==FNR{if ($0 ~ ("<componentName>"name":"comp"</componentName>")) for (i=-2;i<=2;i++) del[NR+i]; next} !(FNR in del)' file  "force-app/main/default/flexipages/${reference}.flexipage-meta.xml" > "copy.xml"
        awk -v name="$namespace" -v comp="$component" 'NR==FNR{if ($0 ~ ("<componentName>"name":"comp"</componentName>")) for (i=-2;i<=2;i++) del[NR+i]; next} !(FNR in del)' "force-app/main/default/flexipages/${reference}.flexipage-meta.xml" "force-app/main/default/flexipages/${reference}.flexipage-meta.xml" > "copy$component.xml"
        mv "copy$component.xml" "force-app/main/default/flexipages/$reference.flexipage-meta.xml"
        sfdx force:source:deploy -m "FlexiPage:$reference"
    fi
done

sfdx config:set defaultusername=$default