<script lang="ts" setup>
import { IonApp, IonContent, IonPage } from '@ionic/vue'
</script>

<template>
  <IonApp>
    <IonPage>
      <IonContent :fullscreen="true">
        <div class="px-4 sm:px-6 lg:px-16 py-6">
          <slot />
        </div>
      </IonContent>
    </IonPage>
  </IonApp>
</template>
