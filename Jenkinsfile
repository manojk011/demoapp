import groovy.json.JsonSlurperClassic

pipeline {
    agent { label 'cskpcloudxp1861' }
    stages {        
        stage('Initialization') {
            steps {
                echo "******************  intialization script execution  ******************"
                script{
                    
                    stageName = ''
                    parsedJson = null
                    inputFile = readFile("${env.WORKSPACE}/pipeline.json")
                    parsedJson = new JsonSlurperClassic().parseText(inputFile)
                    println "Done reading JSON Object"
                }

            }
        }
        stage('Build') {
            agent {
                label 'pipelinenode8'
            }
            steps {
                script {
                    stageName = 'Build'
                }
                sh 'echo "$pwd"'      
                // Call NpmBuilder after all files have been created
                //NPMBuilder(parsedJson)
            }
            post {
                success {
                    StatusReporter('SUCCESS', stageName, parsedJson)
                }
                failure {
                    StatusReporter('FAILURE', stageName, parsedJson)
                }
                unstable {
                    StatusReporter('UNSTABLE', stageName, parsedJson)
                }
            }
        }
        stage('AKS Image Build'){
            steps{
                echo "******************  Build the image  ******************"
                script {
                    //sh "rm -rf node_modules/*/test && rm -rf node_modules/*/test"
                    AppImageBuild(parsedJson)
                    CreateKubeSecrets('dev', parsedJson)
                    checkout([$class: 'GitSCM', branches: [[name: '*/release/v1.3.1']], doGenerateSubmoduleConfigurations: false, extensions: [[$class: 'RelativeTargetDirectory', relativeTargetDir: 'helmBaseRepo']], submoduleCfg: [], userRemoteConfigs: [[credentialsId: 'manoj-test', url: 'https://github.kp.org/CSG/DeploymentHelmBase.git']]])
                    sh "rm -rf manifests"
                    sh "mkdir manifests"
                    echo "*** Generate manifests"
                    sh "cp ./values.yaml ./helmBaseRepo/AppType1/values.yaml"
                    sh "helm template --values ./helmBaseRepo/AppType1/values.yaml --output-dir ./manifests ./helmBaseRepo/AppType1"
                }
            }
        }
        stage('Deploy Sandbox') {
            steps {
                echo "******************  Apply generated manifests  ******************"
                AKSDeploy('dev', parsedJson);              
            }
        }
    }
}
        
  
