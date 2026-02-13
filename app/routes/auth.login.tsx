import { useState } from "react";
import { Form, useActionData, useLoaderData } from "react-router";
import { AppProvider as PolarisAppProvider, Page, Layout, Card, FormLayout, TextField, Button, Text } from "@shopify/polaris";
import translations from "@shopify/polaris/locales/en.json";
import { login } from "../shopify.server";
import { loginErrorMessage } from "~/routes/auth.login.error";

export const loader = async ({ request }: any) => {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  return { error };
};

export const action = async ({ request }: any) => {
  return await login(request); 
};

export default function AuthLogin() {
  const { error } = useLoaderData() as any;
  const [shop, setShop] = useState("");

  const errorMessage = error ? loginErrorMessage(error) : "";

  return (
    <PolarisAppProvider i18n={translations}>
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <Text as="h2" variant="headingMd">
                Log in
              </Text>
              
              <Form method="post">
                <FormLayout>
                  <Text as="p" variant="bodyMd">
                    Enter your shop domain to log in or install this app.
                  </Text>
                  
                  {errorMessage && (
                    <Text as="p" variant="bodyMd" tone="critical">
                      {errorMessage}
                    </Text>
                  )}

                  <TextField
                    label="Shop domain"
                    name="shop"
                    value={shop}
                    onChange={(value) => setShop(value)}
                    autoComplete="organization"
                    placeholder="example.myshopify.com"
                  />
                  
                  <Button submit variant="primary">
                    Log in
                  </Button>
                </FormLayout>
              </Form>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </PolarisAppProvider>
  );
}
