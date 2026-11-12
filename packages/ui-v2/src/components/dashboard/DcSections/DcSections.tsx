import { Badge } from "../../primitives/Badge";
import {
  Card,
  CardHead,
  Foot,
  Grid,
  Label,
  Row,
  Rows,
  Subtitle,
  Title,
  Value,
} from "./DcSections.styles";
import type { DcSectionsProps } from "./DcSections.types";

/** DC bölümleri — BSC → DC bus → PCS, cihazdan gelen satır değerleri. */
export const DcSections = ({ sections, className }: DcSectionsProps) => (
  <Grid className={className}>
    {sections.map((section) => (
      <Card key={section.key}>
        <CardHead>
          <div>
            <Title>{section.title}</Title>
            <Subtitle>{section.subtitle}</Subtitle>
          </div>
          <Badge tone={section.badge.tone}>{section.badge.label}</Badge>
        </CardHead>
        <Rows>
          {section.rows.map((row) => (
            <Row key={row.label}>
              <Label>{row.label}</Label>
              <Value $tone={row.tone ?? "default"}>{row.value}</Value>
            </Row>
          ))}
        </Rows>
        <Foot>{section.footer}</Foot>
      </Card>
    ))}
  </Grid>
);

DcSections.displayName = "DcSections";
